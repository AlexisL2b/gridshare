"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { EnergyTransaction } from "@/types";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface HostDashboard {
  type: "HOST";
  totalCapacity: number;
  totalAvailable: number;
  activeOffers: number;
  totalRevenue: number;
  recentTransactions: EnergyTransaction[];
}

interface ClientDashboard {
  type: "CLIENT";
  totalStored: number;
  totalAllocated: number;
  activeContracts: number;
  totalSpent: number;
  recentTransactions: EnergyTransaction[];
}

type DashboardData = HostDashboard | ClientDashboard;

interface ChartData {
  dailyData: { date: string; stored: number; restored: number; cost: number }[];
  capacityUsed: number;
  capacityFree: number;
}

const COLORS = ["#3b82f6", "#e5e7eb"];
const PIE_COLORS = ["#3b82f6", "#10b981"];

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    Promise.all([
      api.get<DashboardData>("/users/me/dashboard"),
      api.get<ChartData>("/users/me/chart-data"),
    ])
      .then(([dashRes, chartRes]) => {
        setData(dashRes.data);
        setChartData(chartRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="p-8">
        <p className="text-gray-500">Impossible de charger le dashboard.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>

      {data.type === "HOST" ? (
        <HostView data={data} />
      ) : (
        <ClientView data={data} />
      )}

      {chartData && (
        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <EnergyAreaChart dailyData={chartData.dailyData} />
          </div>
          <div>
            <CapacityPieChart
              used={chartData.capacityUsed}
              free={chartData.capacityFree}
              label={data.type === "HOST" ? "Capacité batterie" : "Espace réservé"}
            />
          </div>
        </section>
      )}

      {chartData && chartData.dailyData.length > 0 && (
        <section className="mt-6">
          <CostBarChart
            dailyData={chartData.dailyData}
            label={data.type === "HOST" ? "Revenus" : "Coûts"}
          />
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Transactions récentes</h2>
        <TransactionTable transactions={data.recentTransactions} />
      </section>
    </main>
  );
}

function EnergyAreaChart({
  dailyData,
}: {
  dailyData: { date: string; stored: number; restored: number }[];
}) {
  if (dailyData.length === 0) return null;

  const formatted = dailyData.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    stored: parseFloat(d.stored.toFixed(2)),
    restored: parseFloat(d.restored.toFixed(2)),
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 font-semibold">Flux d&apos;énergie (kWh/jour)</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={formatted}>
          <defs>
            <linearGradient id="colorStored" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorRestored" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip />
          <Legend />
          <Area
            type="monotone"
            dataKey="stored"
            name="Stockage"
            stroke="#3b82f6"
            fillOpacity={1}
            fill="url(#colorStored)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="restored"
            name="Restitution"
            stroke="#f97316"
            fillOpacity={1}
            fill="url(#colorRestored)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function CapacityPieChart({
  used,
  free,
  label,
}: {
  used: number;
  free: number;
  label: string;
}) {
  const total = used + free;
  if (total === 0) return null;

  const data = [
    { name: "Utilisé", value: parseFloat(used.toFixed(1)) },
    { name: "Disponible", value: parseFloat(free.toFixed(1)) },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-2 font-semibold">{label}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={4}
            dataKey="value"
            label={({ name, value }) => `${name}: ${value} kWh`}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={PIE_COLORS[index]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => `${value} kWh`} />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-center text-sm text-gray-500">
        {((used / total) * 100).toFixed(0)}% utilisé ({total.toFixed(1)} kWh total)
      </p>
    </div>
  );
}

function CostBarChart({
  dailyData,
  label,
}: {
  dailyData: { date: string; cost: number }[];
  label: string;
}) {
  const formatted = dailyData.map((d) => ({
    date: new Date(d.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    montant: parseFloat(d.cost.toFixed(2)),
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 font-semibold">{label} par jour (€)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip formatter={(value: number) => `${value} €`} />
          <Bar dataKey="montant" name={label} fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function HostView({ data }: { data: HostDashboard }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Capacité totale" value={`${data.totalCapacity.toFixed(1)} kWh`} />
      <StatCard label="Disponible" value={`${data.totalAvailable.toFixed(1)} kWh`} accent="green" />
      <StatCard label="Offres actives" value={String(data.activeOffers)} accent="blue" />
      <StatCard label="Revenus totaux" value={`${data.totalRevenue.toFixed(2)} €`} accent="emerald" />
    </div>
  );
}

function ClientView({ data }: { data: ClientDashboard }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Énergie stockée" value={`${data.totalStored.toFixed(1)} kWh`} accent="blue" />
      <StatCard label="Capacité réservée" value={`${data.totalAllocated.toFixed(1)} kWh`} />
      <StatCard label="Contrats actifs" value={String(data.activeContracts)} accent="green" />
      <StatCard label="Coût total" value={`${data.totalSpent.toFixed(2)} €`} accent="orange" />
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = "gray",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  const colors: Record<string, string> = {
    gray: "border-gray-200",
    blue: "border-blue-400",
    green: "border-green-400",
    emerald: "border-emerald-400",
    orange: "border-orange-400",
  };

  return (
    <div className={`rounded-xl border-l-4 bg-white p-5 shadow-sm ${colors[accent] ?? colors.gray}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function TransactionTable({ transactions }: { transactions: EnergyTransaction[] }) {
  if (transactions.length === 0) {
    return <p className="text-sm text-gray-400">Aucune transaction pour le moment.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Quantité</th>
            <th className="px-4 py-3">Prix/kWh</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {transactions.map((t) => (
            <tr key={t.id}>
              <td className="px-4 py-3">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    t.type === "STORE"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {t.type === "STORE" ? "Stockage" : "Restitution"}
                </span>
              </td>
              <td className="px-4 py-3">{t.amountKwh.toFixed(2)} kWh</td>
              <td className="px-4 py-3">{t.pricePerKwh.toFixed(3)} €</td>
              <td className="px-4 py-3 font-medium">{t.totalCost.toFixed(2)} €</td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(t.createdAt).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
