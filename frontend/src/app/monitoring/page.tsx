"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
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

interface PlatformStats {
  users: { total: number; hosts: number; clients: number };
  infrastructure: {
    batteries: number;
    totalCapacity: number;
    totalAvailable: number;
    activeOffers: number;
    activeContracts: number;
  };
  energy: { totalStored: number; totalRestored: number; netStored: number };
  market: {
    currentPrice: number;
    totalSupply: number;
    totalDemand: number;
    totalVolume: number;
    totalTransactions: number;
  };
  dailyActivity: {
    date: string;
    stored: number;
    restored: number;
    transactions: number;
    volume: number;
  }[];
}

export default function MonitoringPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    api
      .get<PlatformStats>("/admin/stats")
      .then(({ data }) => setStats(data))
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

  if (!stats) {
    return (
      <main className="p-8">
        <p className="text-gray-500">Impossible de charger les statistiques.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Monitoring Plateforme</h1>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
          </span>
          <span className="text-sm text-gray-500">En ligne</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Utilisateurs" value={stats.users.total} sub={`${stats.users.hosts} hôtes / ${stats.users.clients} clients`} accent="blue" />
        <KpiCard label="Batteries" value={stats.infrastructure.batteries} sub={`${stats.infrastructure.totalCapacity.toFixed(0)} kWh capacité totale`} accent="purple" />
        <KpiCard label="Transactions" value={stats.market.totalTransactions} sub={`${stats.market.totalVolume.toFixed(2)} € volume total`} accent="emerald" />
        <KpiCard label="Prix dynamique" value={`${stats.market.currentPrice.toFixed(3)} €`} sub="par kWh" accent="orange" />
      </div>

      {/* Énergie en circulation */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <EnergyCard label="Énergie stockée" value={stats.energy.totalStored} color="blue" />
        <EnergyCard label="Énergie restituée" value={stats.energy.totalRestored} color="orange" />
        <EnergyCard label="Stock net" value={stats.energy.netStored} color="emerald" />
      </div>

      {/* Graphiques */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityChart dailyData={stats.dailyActivity} />
        </div>
        <div>
          <SupplyDemandChart supply={stats.market.totalSupply} demand={stats.market.totalDemand} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <VolumeChart dailyData={stats.dailyActivity} />
        <InfrastructurePanel infra={stats.infrastructure} />
      </div>
    </main>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  sub: string;
  accent: string;
}) {
  const bg: Record<string, string> = {
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    emerald: "from-emerald-500 to-emerald-600",
    orange: "from-orange-500 to-orange-600",
  };

  return (
    <div className={`rounded-xl bg-gradient-to-br ${bg[accent]} p-5 text-white shadow-md`}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs opacity-70">{sub}</p>
    </div>
  );
}

function EnergyCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const borders: Record<string, string> = {
    blue: "border-blue-400",
    orange: "border-orange-400",
    emerald: "border-emerald-400",
  };

  return (
    <div className={`rounded-xl border-l-4 bg-white p-4 shadow-sm ${borders[color]}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value.toFixed(1)} kWh</p>
    </div>
  );
}

function ActivityChart({
  dailyData,
}: {
  dailyData: { date: string; stored: number; restored: number; transactions: number }[];
}) {
  const formatted = dailyData.map((d) => ({
    date: new Date(d.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    Stockage: parseFloat(d.stored.toFixed(2)),
    Restitution: parseFloat(d.restored.toFixed(2)),
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 font-semibold">Activité énergétique globale (kWh/jour)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={formatted}>
          <defs>
            <linearGradient id="gStored" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gRestored" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="Stockage" stroke="#3b82f6" fillOpacity={1} fill="url(#gStored)" strokeWidth={2} />
          <Area type="monotone" dataKey="Restitution" stroke="#f97316" fillOpacity={1} fill="url(#gRestored)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SupplyDemandChart({ supply, demand }: { supply: number; demand: number }) {
  const data = [
    { name: "Offre", value: parseFloat(supply.toFixed(1)) },
    { name: "Demande", value: parseFloat(demand.toFixed(1)) },
  ];

  const COLORS = ["#10b981", "#f97316"];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-2 font-semibold">Offre vs Demande</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={4}
            dataKey="value"
            label={({ name, value }) => `${name}: ${value} kWh`}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => `${value} kWh`} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-emerald-500" />
          Offre disponible
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-orange-500" />
          Demande active
        </div>
      </div>
    </div>
  );
}

function VolumeChart({
  dailyData,
}: {
  dailyData: { date: string; volume: number; transactions: number }[];
}) {
  const formatted = dailyData.map((d) => ({
    date: new Date(d.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    volume: parseFloat(d.volume.toFixed(2)),
    transactions: d.transactions,
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 font-semibold">Volume financier par jour (€)</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip />
          <Bar dataKey="volume" name="Volume (€)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function InfrastructurePanel({
  infra,
}: {
  infra: PlatformStats["infrastructure"];
}) {
  const usedPercent = infra.totalCapacity > 0
    ? ((infra.totalCapacity - infra.totalAvailable) / infra.totalCapacity) * 100
    : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 font-semibold">Infrastructure</h3>
      <div className="space-y-4">
        <InfraRow label="Batteries enregistrées" value={String(infra.batteries)} />
        <InfraRow label="Capacité totale" value={`${infra.totalCapacity.toFixed(1)} kWh`} />
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-gray-500">Utilisation réseau</span>
            <span className="font-medium">{usedPercent.toFixed(0)}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
              style={{ width: `${usedPercent}%` }}
            />
          </div>
        </div>
        <InfraRow label="Offres actives" value={String(infra.activeOffers)} />
        <InfraRow label="Contrats actifs" value={String(infra.activeContracts)} />
        <InfraRow label="Disponible" value={`${infra.totalAvailable.toFixed(1)} kWh`} />
      </div>
    </div>
  );
}

function InfraRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
