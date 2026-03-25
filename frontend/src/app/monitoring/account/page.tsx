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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// -- Types HOST --
interface HostMonitoring {
  type: "HOST";
  summary: {
    totalCapacity: number;
    totalAvailable: number;
    totalAllocated: number;
    totalRevenue: number;
    totalStored: number;
    totalRestored: number;
    totalTransactions: number;
    avgRevenuePerDay: number;
    activeBatteries: number;
    activeOffers: number;
  };
  batteryStats: {
    id: string;
    label: string;
    capacityKwh: number;
    availableKwh: number;
    allocatedKwh: number;
    usagePercent: number;
    offersCount: number;
  }[];
  offerStats: {
    id: string;
    batteryLabel: string;
    capacityKwh: number;
    remainingKwh: number;
    pricePerKwh: number;
    status: string;
    contractsCount: number;
    activeContracts: number;
    totalUsed: number;
  }[];
  dailyData: { date: string; stored: number; restored: number; revenue: number; txCount: number }[];
  hourlyPattern: { hour: number; stored: number; restored: number }[];
  cumulativeRevenue: { date: string; cumulative: number }[];
}

// -- Types CLIENT --
interface ClientMonitoring {
  type: "CLIENT";
  summary: {
    totalAllocated: number;
    totalStored: number;
    totalFree: number;
    totalCost: number;
    totalEnergyStored: number;
    totalEnergyRestored: number;
    totalTransactions: number;
    avgCostPerDay: number;
    avgPricePerKwh: number;
    activeContracts: number;
  };
  contractStats: {
    id: string;
    hostName: string;
    batteryLabel: string;
    allocatedKwh: number;
    usedKwh: number;
    freeKwh: number;
    usagePercent: number;
    pricePerKwh: number;
    status: string;
    startDate: string;
  }[];
  dailyData: { date: string; stored: number; restored: number; cost: number; txCount: number }[];
  hourlyPattern: { hour: number; stored: number; restored: number }[];
  cumulativeCost: { date: string; cumulative: number }[];
  energyByHost: { hostName: string; stored: number; cost: number }[];
}

type MonitoringData = HostMonitoring | ClientMonitoring;

const COLORS = ["#3b82f6", "#10b981", "#f97316", "#8b5cf6", "#ec4899", "#14b8a6"];

export default function AccountMonitoringPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    api.get<MonitoringData>("/users/me/monitoring")
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return <main className="flex min-h-[60vh] items-center justify-center"><p className="text-gray-500">Chargement...</p></main>;
  }

  if (!data) {
    return <main className="p-8"><p className="text-gray-500">Impossible de charger les données.</p></main>;
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mon Monitoring</h1>
          <p className="text-sm text-gray-500">
            Analyse détaillée de votre compte {data.type === "HOST" ? "hôte" : "client"}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${
          data.type === "HOST" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
        }`}>
          {data.type === "HOST" ? "Hôte" : "Client"}
        </span>
      </div>

      {data.type === "HOST" ? <HostMonitoringView data={data} /> : <ClientMonitoringView data={data} />}
    </main>
  );
}

// ===================== HOST VIEW =====================

function HostMonitoringView({ data }: { data: HostMonitoring }) {
  const s = data.summary;
  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MiniKpi label="Capacité totale" value={`${s.totalCapacity.toFixed(1)} kWh`} />
        <MiniKpi label="Alloué" value={`${s.totalAllocated.toFixed(1)} kWh`} accent="blue" />
        <MiniKpi label="Disponible" value={`${s.totalAvailable.toFixed(1)} kWh`} accent="green" />
        <MiniKpi label="Revenus totaux" value={`${s.totalRevenue.toFixed(2)} €`} accent="emerald" />
        <MiniKpi label="Moy/jour" value={`${s.avgRevenuePerDay.toFixed(2)} €`} accent="purple" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MiniKpi label="Transactions" value={String(s.totalTransactions)} />
        <MiniKpi label="Énergie stockée" value={`${s.totalStored.toFixed(1)} kWh`} accent="blue" />
        <MiniKpi label="Énergie restituée" value={`${s.totalRestored.toFixed(1)} kWh`} accent="orange" />
      </div>

      {/* Batteries */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 font-semibold">État des batteries</h3>
        <div className="space-y-3">
          {data.batteryStats.map((b) => (
            <div key={b.id} className="rounded-lg border border-gray-100 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">{b.label}</span>
                <span className="text-sm text-gray-500">{b.capacityKwh.toFixed(1)} kWh</span>
              </div>
              <div className="mb-1 flex justify-between text-xs text-gray-500">
                <span>Alloué : {b.allocatedKwh.toFixed(1)} kWh</span>
                <span>Libre : {b.availableKwh.toFixed(1)} kWh</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${b.usagePercent}%` }} />
              </div>
              <p className="mt-1 text-right text-xs text-gray-400">{b.usagePercent.toFixed(0)}% utilisé | {b.offersCount} offre(s)</p>
            </div>
          ))}
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Flux énergétiques (kWh/jour)">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={fmtDaily(data.dailyData)}>
              <defs>
                <linearGradient id="hStored" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="hRestored" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} /><stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" fontSize={11} /><YAxis fontSize={11} />
              <Tooltip /><Legend />
              <Area type="monotone" dataKey="stored" name="Stockage" stroke="#3b82f6" fillOpacity={1} fill="url(#hStored)" strokeWidth={2} />
              <Area type="monotone" dataKey="restored" name="Restitution" stroke="#f97316" fillOpacity={1} fill="url(#hRestored)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenus cumulés (€)">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={fmtDates(data.cumulativeRevenue)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" fontSize={11} /><YAxis fontSize={11} />
              <Tooltip formatter={(v) => `${v} €`} />
              <Line type="monotone" dataKey="cumulative" name="Revenus cumulés" stroke="#10b981" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Revenus par jour (€)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={fmtDaily(data.dailyData)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" fontSize={11} /><YAxis fontSize={11} />
              <Tooltip formatter={(v) => `${v} €`} />
              <Bar dataKey="revenue" name="Revenus" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pattern horaire d'utilisation">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.hourlyPattern.map(h => ({ ...h, hour: `${h.hour}h`, stored: +h.stored.toFixed(2), restored: +h.restored.toFixed(2) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" fontSize={10} /><YAxis fontSize={11} />
              <Tooltip /><Legend />
              <Bar dataKey="stored" name="Stockage" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              <Bar dataKey="restored" name="Restitution" fill="#f97316" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Offres détaillées */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 font-semibold">Détail des offres</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Batterie</th>
                <th className="px-4 py-3">Capacité</th>
                <th className="px-4 py-3">Restant</th>
                <th className="px-4 py-3">Prix</th>
                <th className="px-4 py-3">Contrats</th>
                <th className="px-4 py-3">Stocké</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.offerStats.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-medium">{o.batteryLabel}</td>
                  <td className="px-4 py-3">{o.capacityKwh.toFixed(1)} kWh</td>
                  <td className="px-4 py-3">{o.remainingKwh.toFixed(1)} kWh</td>
                  <td className="px-4 py-3">{o.pricePerKwh.toFixed(3)} €</td>
                  <td className="px-4 py-3">{o.activeContracts}/{o.contractsCount}</td>
                  <td className="px-4 py-3">{o.totalUsed.toFixed(1)} kWh</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===================== CLIENT VIEW =====================

function ClientMonitoringView({ data }: { data: ClientMonitoring }) {
  const s = data.summary;
  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MiniKpi label="Espace réservé" value={`${s.totalAllocated.toFixed(1)} kWh`} />
        <MiniKpi label="Stocké" value={`${s.totalStored.toFixed(1)} kWh`} accent="blue" />
        <MiniKpi label="Libre" value={`${s.totalFree.toFixed(1)} kWh`} accent="green" />
        <MiniKpi label="Coût total" value={`${s.totalCost.toFixed(2)} €`} accent="orange" />
        <MiniKpi label="Moy/jour" value={`${s.avgCostPerDay.toFixed(2)} €`} accent="purple" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MiniKpi label="Transactions" value={String(s.totalTransactions)} />
        <MiniKpi label="Prix moyen" value={`${s.avgPricePerKwh.toFixed(3)} €/kWh`} accent="blue" />
        <MiniKpi label="Contrats actifs" value={String(s.activeContracts)} accent="green" />
      </div>

      {/* Contrats */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 font-semibold">Mes contrats de stockage</h3>
        <div className="space-y-3">
          {data.contractStats.map((c) => (
            <div key={c.id} className="rounded-lg border border-gray-100 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <span className="font-medium">{c.batteryLabel}</span>
                  <span className="ml-2 text-sm text-gray-500">chez {c.hostName}</span>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <div className="mb-1 flex justify-between text-xs text-gray-500">
                <span>Stocké : {c.usedKwh.toFixed(1)} / {c.allocatedKwh.toFixed(1)} kWh</span>
                <span>{c.pricePerKwh.toFixed(3)} €/kWh</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600" style={{ width: `${c.usagePercent}%` }} />
              </div>
              <p className="mt-1 text-right text-xs text-gray-400">{c.usagePercent.toFixed(0)}% utilisé</p>
            </div>
          ))}
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Flux énergétiques (kWh/jour)">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={fmtDailyClient(data.dailyData)}>
              <defs>
                <linearGradient id="cStored" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cRestored" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} /><stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" fontSize={11} /><YAxis fontSize={11} />
              <Tooltip /><Legend />
              <Area type="monotone" dataKey="stored" name="Stockage" stroke="#3b82f6" fillOpacity={1} fill="url(#cStored)" strokeWidth={2} />
              <Area type="monotone" dataKey="restored" name="Restitution" stroke="#f97316" fillOpacity={1} fill="url(#cRestored)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Coûts cumulés (€)">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={fmtDates(data.cumulativeCost)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" fontSize={11} /><YAxis fontSize={11} />
              <Tooltip formatter={(v) => `${v} €`} />
              <Line type="monotone" dataKey="cumulative" name="Coûts cumulés" stroke="#f97316" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Coûts par jour (€)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={fmtDailyClient(data.dailyData)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" fontSize={11} /><YAxis fontSize={11} />
              <Tooltip formatter={(v) => `${v} €`} />
              <Bar dataKey="cost" name="Coûts" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pattern horaire d'utilisation">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.hourlyPattern.map(h => ({ ...h, hour: `${h.hour}h`, stored: +h.stored.toFixed(2), restored: +h.restored.toFixed(2) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" fontSize={10} /><YAxis fontSize={11} />
              <Tooltip /><Legend />
              <Bar dataKey="stored" name="Stockage" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              <Bar dataKey="restored" name="Restitution" fill="#f97316" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Répartition par hôte */}
      {data.energyByHost.length > 0 && (
        <ChartCard title="Répartition de l'énergie par hôte">
          <div className="flex flex-col items-center lg:flex-row lg:justify-around">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.energyByHost.map((h) => ({ name: h.hostName, value: +h.stored.toFixed(1) }))}
                  cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value"
                  label={({ name, value }) => `${name}: ${value} kWh`}
                >
                  {data.energyByHost.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v} kWh`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}
    </div>
  );
}

// ===================== SHARED COMPONENTS =====================

function MiniKpi({ label, value, accent = "gray" }: { label: string; value: string; accent?: string }) {
  const borders: Record<string, string> = {
    gray: "border-gray-200", blue: "border-blue-400", green: "border-green-400",
    emerald: "border-emerald-400", orange: "border-orange-400", purple: "border-purple-400",
  };
  return (
    <div className={`rounded-xl border-l-4 bg-white p-4 shadow-sm ${borders[accent] ?? borders.gray}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 text-lg font-bold">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    FULL: "bg-orange-100 text-orange-700",
    INACTIVE: "bg-gray-100 text-gray-600",
    COMPLETED: "bg-blue-100 text-blue-700",
    CANCELLED: "bg-red-100 text-red-600",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.INACTIVE}`}>
      {status}
    </span>
  );
}

// ===================== DATA FORMATTERS =====================

function fmtDaily(data: { date: string; stored: number; restored: number; revenue: number }[]) {
  return data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    stored: +d.stored.toFixed(2),
    restored: +d.restored.toFixed(2),
    revenue: +d.revenue.toFixed(2),
  }));
}

function fmtDailyClient(data: { date: string; stored: number; restored: number; cost: number }[]) {
  return data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    stored: +d.stored.toFixed(2),
    restored: +d.restored.toFixed(2),
    cost: +d.cost.toFixed(2),
  }));
}

function fmtDates(data: { date: string; cumulative: number }[]) {
  return data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    cumulative: d.cumulative,
  }));
}
