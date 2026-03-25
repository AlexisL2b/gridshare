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

interface OrderBook {
  buyOrders: TradeOrder[];
  sellOrders: TradeOrder[];
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
  const [orderBook, setOrderBook] = useState<OrderBook>({ buyOrders: [], sellOrders: [] });
  const [myOrders, setMyOrders] = useState<TradeOrder[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [pricesRes, bookRes, myRes, tradesRes] = await Promise.all([
        api.get("/market/prices/multi"),
        api.get("/market/orders/book"),
        api.get("/market/orders/mine"),
        api.get("/market/trades"),
      ]);
      setMultiPrices(pricesRes.data);
      setOrderBook(bookRes.data);
      setMyOrders(myRes.data);
      setTrades(tradesRes.data);
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

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Salle des Marchés</h1>
            <p className="text-gray-400 text-sm">Trading d&apos;énergie en temps réel</p>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="bg-emerald-900/40 text-emerald-400 px-3 py-1 rounded-full">
              Marché ouvert
            </span>
          </div>
        </header>

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
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4 text-gray-200">Carnet d&apos;ordres</h2>
              <OrderBookPanel orderBook={orderBook} />
            </section>

            <section className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4 text-gray-200">Dernières transactions</h2>
              <TradesTable trades={trades} />
            </section>
          </div>

          <div className="space-y-6">
            <section className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4 text-gray-200">Passer un ordre</h2>
              <OrderForm onOrderPlaced={fetchAll} />
            </section>

            <section className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4 text-gray-200">Mes ordres</h2>
              <MyOrdersPanel orders={myOrders} onCancelled={fetchAll} />
            </section>
          </div>
        </div>
      </div>
    </main>
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

function OrderBookPanel({ orderBook }: { orderBook: OrderBook }) {
  const maxBuyQty = Math.max(...orderBook.buyOrders.map((o) => o.amountKwh - o.filledKwh), 1);
  const maxSellQty = Math.max(...orderBook.sellOrders.map((o) => o.amountKwh - o.filledKwh), 1);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h3 className="text-sm font-medium text-emerald-400 mb-2">Achats (BUY)</h3>
        <div className="space-y-1">
          <div className="grid grid-cols-3 text-xs text-gray-500 mb-1">
            <span>Prix (€/kWh)</span>
            <span className="text-right">Qté (kWh)</span>
            <span className="text-right">Utilisateur</span>
          </div>
          {orderBook.buyOrders.length === 0 && (
            <p className="text-gray-600 text-xs">Aucun ordre d&apos;achat</p>
          )}
          {orderBook.buyOrders.map((o) => {
            const remaining = o.amountKwh - o.filledKwh;
            const pct = (remaining / maxBuyQty) * 100;
            return (
              <div key={o.id} className="relative grid grid-cols-3 text-xs py-1">
                <div
                  className="absolute inset-0 bg-emerald-500/10 rounded"
                  style={{ width: `${pct}%` }}
                />
                <span className="relative text-emerald-400 font-mono">
                  {o.pricePerKwh.toFixed(3)}
                </span>
                <span className="relative text-right text-gray-300 font-mono">
                  {remaining.toFixed(2)}
                </span>
                <span className="relative text-right text-gray-500 truncate">
                  {o.user?.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-red-400 mb-2">Ventes (SELL)</h3>
        <div className="space-y-1">
          <div className="grid grid-cols-3 text-xs text-gray-500 mb-1">
            <span>Prix (€/kWh)</span>
            <span className="text-right">Qté (kWh)</span>
            <span className="text-right">Utilisateur</span>
          </div>
          {orderBook.sellOrders.length === 0 && (
            <p className="text-gray-600 text-xs">Aucun ordre de vente</p>
          )}
          {orderBook.sellOrders.map((o) => {
            const remaining = o.amountKwh - o.filledKwh;
            const pct = (remaining / maxSellQty) * 100;
            return (
              <div key={o.id} className="relative grid grid-cols-3 text-xs py-1">
                <div
                  className="absolute inset-0 bg-red-500/10 rounded"
                  style={{ width: `${pct}%` }}
                />
                <span className="relative text-red-400 font-mono">
                  {o.pricePerKwh.toFixed(3)}
                </span>
                <span className="relative text-right text-gray-300 font-mono">
                  {remaining.toFixed(2)}
                </span>
                <span className="relative text-right text-gray-500 truncate">
                  {o.user?.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OrderForm({ onOrderPlaced }: { onOrderPlaced: () => void }) {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      await api.post("/market/orders", {
        side,
        amountKwh: parseFloat(amount),
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

      <div>
        <label className="block text-xs text-gray-400 mb-1">Quantité (kWh)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="ex: 5.00"
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
        disabled={submitting}
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

function MyOrdersPanel({
  orders,
  onCancelled,
}: {
  orders: TradeOrder[];
  onCancelled: () => void;
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
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {orders.map((o) => (
        <div
          key={o.id}
          className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2 text-xs"
        >
          <div className="flex items-center gap-2">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                o.side === "BUY"
                  ? "bg-emerald-900/50 text-emerald-400"
                  : "bg-red-900/50 text-red-400"
              }`}
            >
              {o.side}
            </span>
            <span className="text-gray-300 font-mono">
              {(o.amountKwh - o.filledKwh).toFixed(2)}/{o.amountKwh.toFixed(2)} kWh
            </span>
            <span className="text-gray-500">@</span>
            <span className="text-gray-300 font-mono">{o.pricePerKwh.toFixed(3)} €</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={o.status} />
            {(o.status === "OPEN" || o.status === "PARTIALLY_FILLED") && (
              <button
                onClick={() => handleCancel(o.id)}
                className="text-gray-500 hover:text-red-400 transition-colors"
                title="Annuler"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function TradesTable({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) {
    return <p className="text-gray-600 text-xs">Aucune transaction</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800">
            <th className="text-left py-2 font-medium">Date</th>
            <th className="text-left py-2 font-medium">Acheteur</th>
            <th className="text-left py-2 font-medium">Vendeur</th>
            <th className="text-right py-2 font-medium">Qté (kWh)</th>
            <th className="text-right py-2 font-medium">Prix (€/kWh)</th>
            <th className="text-right py-2 font-medium">Total (€)</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
              <td className="py-2 text-gray-400">
                {new Date(t.createdAt).toLocaleString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="py-2 text-emerald-400">{t.buyOrder?.user?.name || "—"}</td>
              <td className="py-2 text-red-400">{t.sellOrder?.user?.name || "—"}</td>
              <td className="py-2 text-right text-gray-300 font-mono">
                {t.amountKwh.toFixed(2)}
              </td>
              <td className="py-2 text-right text-gray-300 font-mono">
                {t.pricePerKwh.toFixed(3)}
              </td>
              <td className="py-2 text-right text-white font-mono">
                {(t.amountKwh * t.pricePerKwh).toFixed(2)}
              </td>
            </tr>
          ))}
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
