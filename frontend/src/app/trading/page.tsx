"use client";

import { useEffect, useState, FormEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { TradeOrder, Trade } from "@/types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface PriceEntry {
  timestamp: string;
  price: number;
}

interface AvailableInfo {
  totalStored: number;
  lockedInOrders: number;
  availableToSell: number;
}

const COUNTRIES: Record<string, string> = {
  fr: "France",
  de: "Allemagne",
  be: "Belgique",
  nl: "Pays-Bas",
  at: "Autriche",
};

const COUNTRY_COLORS: Record<string, string> = {
  fr: "#3b82f6",
  de: "#f59e0b",
  be: "#ef4444",
  nl: "#f97316",
  at: "#8b5cf6",
};

export default function TradingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [multiPrices, setMultiPrices] = useState<Record<string, PriceEntry[]>>({});
  const [myOrders, setMyOrders] = useState<TradeOrder[]>([]);
  const [myTrades, setMyTrades] = useState<Trade[]>([]);
  const [available, setAvailable] = useState<AvailableInfo | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [pricesRes, myRes, statsRes, availRes] = await Promise.all([
        api.get("/market/prices/multi"),
        api.get("/market/orders/mine"),
        api.get("/market/stats"),
        api.get("/market/available"),
      ]);
      setMultiPrices(pricesRes.data);
      setMyOrders(myRes.data);
      setMyTrades(statsRes.data.recentTrades || []);
      setAvailable(availRes.data);
    } catch {
      /* ignore */
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user) fetchAll();
  }, [user, loading, router, fetchAll]);

  if (loading || loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <p className="text-gray-400 text-lg">Chargement du marché...</p>
      </div>
    );
  }

  const chartData = buildChartData(multiPrices);
  const openOrders = myOrders.filter(
    (o) => o.status === "OPEN" || o.status === "PARTIALLY_FILLED"
  );
  const closedOrders = myOrders.filter(
    (o) => o.status === "FILLED" || o.status === "CANCELLED"
  );

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Mon Espace Trading</h1>
            <p className="text-gray-400 text-sm">Gérez vos ordres d&apos;achat et de vente d&apos;énergie</p>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="bg-emerald-900/40 text-emerald-400 px-3 py-1 rounded-full">
              Marché ouvert
            </span>
          </div>
        </header>

        {available && user?.type === "CLIENT" && (
          <div className="grid grid-cols-3 gap-4">
            <KpiCard label="Énergie stockée" value={`${available.totalStored} kWh`} color="blue" />
            <KpiCard label="Bloquée (ordres)" value={`${available.lockedInOrders} kWh`} color="yellow" />
            <KpiCard label="Disponible à vendre" value={`${available.availableToSell} kWh`} color="emerald" />
          </div>
        )}

        <section className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h2 className="text-lg font-semibold mb-4 text-gray-200">
            Prix de l&apos;électricité — Marchés européens (€/kWh)
          </h2>
          <PriceChart data={chartData} />
          <div className="flex gap-4 mt-3 flex-wrap">
            {Object.entries(COUNTRIES).map(([code, name]) => (
              <span key={code} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span
                  className="w-3 h-3 rounded-full inline-block"
                  style={{ backgroundColor: COUNTRY_COLORS[code] }}
                />
                {name}
              </span>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6">
            <section className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4 text-gray-200">Passer un ordre</h2>
              <OrderForm onOrderPlaced={fetchAll} available={available} userType={user?.type} />
            </section>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <section className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4 text-gray-200">
                Mes ordres actifs ({openOrders.length})
              </h2>
              <MyOrdersTable orders={openOrders} onCancelled={fetchAll} showCancel />
            </section>

            <section className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4 text-gray-200">Mes transactions</h2>
              <MyTradesTable trades={myTrades} userId={user?.id} />
            </section>

            <section className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4 text-gray-200">
                Historique des ordres ({closedOrders.length})
              </h2>
              <MyOrdersTable orders={closedOrders} onCancelled={fetchAll} showCancel={false} />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "border-blue-800 bg-blue-950/30",
    yellow: "border-yellow-800 bg-yellow-950/30",
    emerald: "border-emerald-800 bg-emerald-950/30",
  };
  const textMap: Record<string, string> = {
    blue: "text-blue-400",
    yellow: "text-yellow-400",
    emerald: "text-emerald-400",
  };

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-xl font-bold mt-1 font-mono ${textMap[color]}`}>{value}</p>
    </div>
  );
}

function buildChartData(multiPrices: Record<string, PriceEntry[]>) {
  const timeMap: Record<string, Record<string, number>> = {};

  for (const [country, prices] of Object.entries(multiPrices)) {
    for (const p of prices) {
      const hour = new Date(p.timestamp).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      if (!timeMap[hour]) timeMap[hour] = {};
      timeMap[hour][country] = parseFloat((p.price / 1000).toFixed(4));
    }
  }

  return Object.entries(timeMap)
    .map(([hour, vals]) => ({ hour, ...vals }))
    .sort((a, b) => a.hour.localeCompare(b.hour));
}

function PriceChart({ data }: { data: Record<string, unknown>[] }) {
  if (data.length === 0) {
    return <p className="text-gray-500 text-sm">Données de prix indisponibles</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          {Object.entries(COUNTRY_COLORS).map(([code, color]) => (
            <linearGradient key={code} id={`grad-${code}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="hour" tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} unit=" €" />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "8px",
            color: "#f3f4f6",
          }}
        />
        <Legend />
        {Object.entries(COUNTRIES).map(([code, name]) => (
          <Area
            key={code}
            type="monotone"
            dataKey={code}
            name={name}
            stroke={COUNTRY_COLORS[code]}
            fill={`url(#grad-${code})`}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

function OrderForm({
  onOrderPlaced,
  available,
  userType,
}: {
  onOrderPlaced: () => void;
  available: AvailableInfo | null;
  userType?: string;
}) {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const maxSell = available?.availableToSell ?? 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const amountNum = parseFloat(amount);
    if (side === "SELL" && amountNum > maxSell) {
      setError(`Maximum vendable : ${maxSell} kWh`);
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/market/orders", {
        side,
        amountKwh: amountNum,
        pricePerKwh: parseFloat(price),
      });
      setSuccess(`Ordre ${side === "BUY" ? "d'achat" : "de vente"} placé !`);
      setAmount("");
      setPrice("");
      onOrderPlaced();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erreur lors du placement de l'ordre"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex rounded-lg overflow-hidden border border-gray-700">
        <button
          type="button"
          onClick={() => setSide("BUY")}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            side === "BUY"
              ? "bg-emerald-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-gray-200"
          }`}
        >
          Acheter
        </button>
        <button
          type="button"
          onClick={() => setSide("SELL")}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            side === "SELL"
              ? "bg-red-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-gray-200"
          }`}
        >
          Vendre
        </button>
      </div>

      {side === "SELL" && userType === "CLIENT" && (
        <div className="bg-gray-800/60 rounded-lg p-3 text-xs">
          <span className="text-gray-400">Disponible à vendre : </span>
          <span className="font-mono text-emerald-400 font-bold">{maxSell} kWh</span>
        </div>
      )}

      <div>
        <label className="block text-xs text-gray-400 mb-1">Quantité (kWh)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          max={side === "SELL" ? maxSell : undefined}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={side === "SELL" ? `max ${maxSell} kWh` : "ex: 5.00"}
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Prix par kWh (€)</label>
        <input
          type="number"
          step="0.001"
          min="0.001"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="ex: 0.150"
        />
      </div>

      {amount && price && (
        <div className="bg-gray-800/50 rounded-lg p-3 text-xs text-gray-300">
          <span className="text-gray-500">Total estimé : </span>
          <span className="font-mono text-white">
            {(parseFloat(amount || "0") * parseFloat(price || "0")).toFixed(2)} €
          </span>
        </div>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}
      {success && <p className="text-emerald-400 text-xs">{success}</p>}

      <button
        type="submit"
        disabled={submitting || (side === "SELL" && maxSell <= 0)}
        className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${
          side === "BUY"
            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
            : "bg-red-600 hover:bg-red-700 text-white"
        } disabled:opacity-50`}
      >
        {submitting
          ? "Envoi..."
          : side === "BUY"
          ? `Acheter ${amount || "..."} kWh`
          : `Vendre ${amount || "..."} kWh`}
      </button>
    </form>
  );
}

function MyOrdersTable({
  orders,
  onCancelled,
  showCancel,
}: {
  orders: TradeOrder[];
  onCancelled: () => void;
  showCancel: boolean;
}) {
  async function handleCancel(id: string) {
    try {
      await api.delete(`/market/orders/${id}`);
      onCancelled();
    } catch {
      /* ignore */
    }
  }

  if (orders.length === 0) {
    return <p className="text-gray-600 text-xs">Aucun ordre</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800">
            <th className="text-left py-2 font-medium">Type</th>
            <th className="text-left py-2 font-medium">Date</th>
            <th className="text-right py-2 font-medium">Qté (kWh)</th>
            <th className="text-right py-2 font-medium">Exécuté</th>
            <th className="text-right py-2 font-medium">Prix (€/kWh)</th>
            <th className="text-right py-2 font-medium">Total (€)</th>
            <th className="text-center py-2 font-medium">Statut</th>
            {showCancel && <th className="text-center py-2 font-medium">Action</th>}
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
              <td className="py-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    o.side === "BUY"
                      ? "bg-emerald-900/50 text-emerald-400"
                      : "bg-red-900/50 text-red-400"
                  }`}
                >
                  {o.side === "BUY" ? "ACHAT" : "VENTE"}
                </span>
              </td>
              <td className="py-2 text-gray-400">
                {new Date(o.createdAt).toLocaleString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="py-2 text-right text-gray-300 font-mono">
                {o.amountKwh.toFixed(2)}
              </td>
              <td className="py-2 text-right text-gray-300 font-mono">
                {o.filledKwh.toFixed(2)}
              </td>
              <td className="py-2 text-right text-gray-300 font-mono">
                {o.pricePerKwh.toFixed(3)}
              </td>
              <td className="py-2 text-right text-white font-mono">
                {(o.amountKwh * o.pricePerKwh).toFixed(2)}
              </td>
              <td className="py-2 text-center">
                <StatusBadge status={o.status} />
              </td>
              {showCancel && (
                <td className="py-2 text-center">
                  <button
                    onClick={() => handleCancel(o.id)}
                    className="text-gray-500 hover:text-red-400 transition-colors text-xs"
                  >
                    Annuler
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MyTradesTable({ trades, userId }: { trades: Trade[]; userId?: string }) {
  if (trades.length === 0) {
    return <p className="text-gray-600 text-xs">Aucune transaction</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800">
            <th className="text-left py-2 font-medium">Date</th>
            <th className="text-left py-2 font-medium">Rôle</th>
            <th className="text-left py-2 font-medium">Contrepartie</th>
            <th className="text-right py-2 font-medium">Qté (kWh)</th>
            <th className="text-right py-2 font-medium">Prix (€/kWh)</th>
            <th className="text-right py-2 font-medium">Montant (€)</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => {
            const isBuyer = t.buyOrder?.user?.name && t.buyOrder?.userId === userId;
            const role = isBuyer ? "Acheteur" : "Vendeur";
            const counterpart = isBuyer
              ? t.sellOrder?.user?.name || "—"
              : t.buyOrder?.user?.name || "—";
            const total = t.amountKwh * t.pricePerKwh;

            return (
              <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2 text-gray-400">
                  {new Date(t.createdAt).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="py-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isBuyer
                        ? "bg-emerald-900/50 text-emerald-400"
                        : "bg-red-900/50 text-red-400"
                    }`}
                  >
                    {role}
                  </span>
                </td>
                <td className="py-2 text-gray-300">{counterpart}</td>
                <td className="py-2 text-right text-gray-300 font-mono">
                  {t.amountKwh.toFixed(2)}
                </td>
                <td className="py-2 text-right text-gray-300 font-mono">
                  {t.pricePerKwh.toFixed(3)}
                </td>
                <td className={`py-2 text-right font-mono font-bold ${
                  isBuyer ? "text-red-400" : "text-emerald-400"
                }`}>
                  {isBuyer ? "-" : "+"}{total.toFixed(2)} €
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    OPEN: "bg-blue-900/50 text-blue-400",
    PARTIALLY_FILLED: "bg-yellow-900/50 text-yellow-400",
    FILLED: "bg-emerald-900/50 text-emerald-400",
    CANCELLED: "bg-gray-800 text-gray-500",
  };

  const labels: Record<string, string> = {
    OPEN: "Ouvert",
    PARTIALLY_FILLED: "Partiel",
    FILLED: "Exécuté",
    CANCELLED: "Annulé",
  };

  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] ${styles[status] || ""}`}>
      {labels[status] || status}
    </span>
  );
}
