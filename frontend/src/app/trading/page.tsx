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
  BarChart,
  Bar,
  LineChart,
  Line,
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
  const [selectedCountry, setSelectedCountry] = useState("fr");

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
      <main className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </main>
    );
  }

  const allCountriesData = buildMultiCountryData(multiPrices);
  const singleCountryData = buildSingleCountryData(multiPrices[selectedCountry] || []);
  const barData = buildBarData(multiPrices);

  const openOrders = myOrders.filter(
    (o) => o.status === "OPEN" || o.status === "PARTIALLY_FILLED"
  );
  const closedOrders = myOrders.filter(
    (o) => o.status === "FILLED" || o.status === "CANCELLED"
  );

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Énergie & Trading</h1>
        <p className="text-sm text-gray-500">
          Cours de l&apos;électricité en temps réel et gestion de vos ordres
        </p>
      </div>

      {/* KPI disponibilite */}
      {available && (
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard label="Énergie disponible" value={`${available.totalStored} kWh`} accent="blue" />
          <KpiCard label="Bloquée (ordres en cours)" value={`${available.lockedInOrders} kWh`} accent="orange" />
          <KpiCard label="Disponible à la vente" value={`${available.availableToSell} kWh`} accent="emerald" />
        </div>
      )}

      {/* Graphiques prix */}
      <section className="space-y-6">
        <h2 className="text-lg font-semibold">Cours de l&apos;électricité (€/kWh)</h2>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Graphique multi-pays */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-medium text-gray-600">Comparaison européenne</h3>
            <MultiCountryChart data={allCountriesData} />
            <div className="flex gap-3 mt-3 flex-wrap">
              {Object.entries(COUNTRIES).map(([code, name]) => (
                <span key={code} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: COUNTRY_COLORS[code] }}
                  />
                  {name}
                </span>
              ))}
            </div>
          </div>

          {/* Graphique un seul pays */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-600">Détail par pays</h3>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1 text-sm"
              >
                {Object.entries(COUNTRIES).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
            <SingleCountryChart data={singleCountryData} color={COUNTRY_COLORS[selectedCountry]} />
          </div>
        </div>

        {/* Graphique barres comparatif */}
        {barData.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-medium text-gray-600">Prix moyen par pays (dernier relevé)</h3>
            <BarComparison data={barData} />
          </div>
        )}
      </section>

      {/* Section ordres */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold mb-4">Passer un ordre</h2>
          <OrderForm onOrderPlaced={fetchAll} available={available} />
        </div>

        <div className="lg:col-span-2 space-y-6">
          {openOrders.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-lg font-semibold mb-4">Ordres actifs ({openOrders.length})</h2>
              <OrdersTable orders={openOrders} onCancelled={fetchAll} showCancel />
            </div>
          )}

          {myTrades.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-lg font-semibold mb-4">Mes transactions</h2>
              <TradesTable trades={myTrades} userId={user?.id} />
            </div>
          )}

          {closedOrders.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-lg font-semibold mb-4">Historique ({closedOrders.length})</h2>
              <OrdersTable orders={closedOrders} onCancelled={fetchAll} showCancel={false} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// ======================== DATA BUILDERS ========================

function buildMultiCountryData(multiPrices: Record<string, PriceEntry[]>) {
  const timeMap: Record<string, Record<string, number>> = {};
  for (const [country, prices] of Object.entries(multiPrices)) {
    for (const p of prices) {
      const hour = new Date(p.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      if (!timeMap[hour]) timeMap[hour] = {};
      timeMap[hour][country] = parseFloat((p.price / 1000).toFixed(4));
    }
  }
  return Object.entries(timeMap)
    .map(([hour, vals]) => ({ hour, ...vals }))
    .sort((a, b) => a.hour.localeCompare(b.hour));
}

function buildSingleCountryData(prices: PriceEntry[]) {
  return prices.map((p) => ({
    hour: new Date(p.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    prix: parseFloat((p.price / 1000).toFixed(4)),
  }));
}

function buildBarData(multiPrices: Record<string, PriceEntry[]>) {
  return Object.entries(multiPrices)
    .filter(([, prices]) => prices.length > 0)
    .map(([country, prices]) => {
      const avg = prices.reduce((s, p) => s + p.price, 0) / prices.length / 1000;
      return { country: COUNTRIES[country] || country, prix: parseFloat(avg.toFixed(4)), fill: COUNTRY_COLORS[country] };
    })
    .sort((a, b) => b.prix - a.prix);
}

// ======================== CHARTS ========================

function MultiCountryChart({ data }: { data: Record<string, unknown>[] }) {
  if (data.length === 0) return <p className="text-gray-400 text-sm py-8 text-center">Données indisponibles</p>;
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} unit=" €" />
        <Tooltip />
        <Legend />
        {Object.entries(COUNTRIES).map(([code, name]) => (
          <Area key={code} type="monotone" dataKey={code} name={name} stroke={COUNTRY_COLORS[code]} fill={COUNTRY_COLORS[code]} fillOpacity={0.08} strokeWidth={2} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

function SingleCountryChart({ data, color }: { data: { hour: string; prix: number }[]; color: string }) {
  if (data.length === 0) return <p className="text-gray-400 text-sm py-8 text-center">Données indisponibles</p>;
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} unit=" €" />
        <Tooltip />
        <Line type="monotone" dataKey="prix" name="Prix" stroke={color} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function BarComparison({ data }: { data: { country: string; prix: number; fill: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis type="number" tick={{ fontSize: 10 }} unit=" €" />
        <YAxis type="category" dataKey="country" tick={{ fontSize: 11 }} width={90} />
        <Tooltip />
        <Bar dataKey="prix" name="Prix moyen" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <rect key={i} fill={d.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ======================== COMPONENTS ========================

function KpiCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  const borders: Record<string, string> = {
    blue: "border-blue-400", orange: "border-orange-400", emerald: "border-emerald-400",
  };
  return (
    <div className={`rounded-xl border-l-4 bg-white p-4 shadow-sm ${borders[accent]}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 text-lg font-bold">{value}</p>
    </div>
  );
}

function OrderForm({ onOrderPlaced, available }: { onOrderPlaced: () => void; available: AvailableInfo | null }) {
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
      await api.post("/market/orders", { side, amountKwh: amountNum, pricePerKwh: parseFloat(price) });
      setSuccess(`Ordre ${side === "BUY" ? "d'achat" : "de vente"} placé`);
      setAmount("");
      setPrice("");
      onOrderPlaced();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erreur"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex rounded-lg overflow-hidden border border-gray-200">
        <button type="button" onClick={() => setSide("BUY")}
          className={`flex-1 py-2 text-sm font-medium ${side === "BUY" ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}>
          Acheter
        </button>
        <button type="button" onClick={() => setSide("SELL")}
          className={`flex-1 py-2 text-sm font-medium ${side === "SELL" ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}>
          Vendre
        </button>
      </div>

      {side === "SELL" && (
        <div className="rounded-lg bg-gray-50 p-3 text-xs">
          <span className="text-gray-500">Disponible : </span>
          <span className="font-mono font-bold text-gray-900">{maxSell} kWh</span>
        </div>
      )}

      <div>
        <label className="block text-xs text-gray-500 mb-1">Quantité (kWh)</label>
        <input type="number" step="0.01" min="0.01" max={side === "SELL" ? maxSell : undefined}
          value={amount} onChange={(e) => setAmount(e.target.value)} required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={side === "SELL" ? `max ${maxSell}` : "ex: 5.00"} />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Prix par kWh (€)</label>
        <input type="number" step="0.001" min="0.001" value={price} onChange={(e) => setPrice(e.target.value)} required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="ex: 0.150" />
      </div>

      {amount && price && (
        <p className="text-xs text-gray-500">
          Total : <span className="font-mono font-bold text-gray-900">{(parseFloat(amount || "0") * parseFloat(price || "0")).toFixed(2)} €</span>
        </p>
      )}

      {error && <p className="text-red-600 text-xs">{error}</p>}
      {success && <p className="text-emerald-600 text-xs">{success}</p>}

      <button type="submit" disabled={submitting || (side === "SELL" && maxSell <= 0)}
        className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Envoi..." : side === "BUY" ? `Acheter ${amount || "..."} kWh` : `Vendre ${amount || "..."} kWh`}
      </button>
    </form>
  );
}

function OrdersTable({ orders, onCancelled, showCancel }: { orders: TradeOrder[]; onCancelled: () => void; showCancel: boolean }) {
  async function handleCancel(id: string) {
    try { await api.delete(`/market/orders/${id}`); onCancelled(); } catch { /* ignore */ }
  }

  if (orders.length === 0) return <p className="text-gray-400 text-sm">Aucun ordre</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs border-b">
            <th className="text-left py-2 font-medium">Type</th>
            <th className="text-left py-2 font-medium">Date</th>
            <th className="text-right py-2 font-medium">Qté</th>
            <th className="text-right py-2 font-medium">Exécuté</th>
            <th className="text-right py-2 font-medium">Prix</th>
            <th className="text-center py-2 font-medium">Statut</th>
            {showCancel && <th className="text-center py-2 font-medium"></th>}
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${o.side === "BUY" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                  {o.side === "BUY" ? "Achat" : "Vente"}
                </span>
              </td>
              <td className="py-2 text-gray-500 text-xs">
                {new Date(o.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </td>
              <td className="py-2 text-right font-mono">{o.amountKwh.toFixed(2)} kWh</td>
              <td className="py-2 text-right font-mono">{o.filledKwh.toFixed(2)} kWh</td>
              <td className="py-2 text-right font-mono">{o.pricePerKwh.toFixed(3)} €</td>
              <td className="py-2 text-center"><StatusBadge status={o.status} /></td>
              {showCancel && (
                <td className="py-2 text-center">
                  <button onClick={() => handleCancel(o.id)} className="text-xs text-red-500 hover:text-red-700">Annuler</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TradesTable({ trades, userId }: { trades: Trade[]; userId?: string }) {
  if (trades.length === 0) return <p className="text-gray-400 text-sm">Aucune transaction</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs border-b">
            <th className="text-left py-2 font-medium">Date</th>
            <th className="text-left py-2 font-medium">Rôle</th>
            <th className="text-left py-2 font-medium">Contrepartie</th>
            <th className="text-right py-2 font-medium">Qté</th>
            <th className="text-right py-2 font-medium">Prix</th>
            <th className="text-right py-2 font-medium">Montant</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => {
            const isBuyer = t.buyOrder?.user?.name && (t.buyOrder as unknown as { userId: string }).userId === userId;
            const counterpart = isBuyer ? t.sellOrder?.user?.name : t.buyOrder?.user?.name;
            const total = t.amountKwh * t.pricePerKwh;
            return (
              <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 text-gray-500 text-xs">
                  {new Date(t.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isBuyer ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {isBuyer ? "Acheteur" : "Vendeur"}
                  </span>
                </td>
                <td className="py-2 text-gray-600">{counterpart || "—"}</td>
                <td className="py-2 text-right font-mono">{t.amountKwh.toFixed(2)} kWh</td>
                <td className="py-2 text-right font-mono">{t.pricePerKwh.toFixed(3)} €</td>
                <td className={`py-2 text-right font-mono font-bold ${isBuyer ? "text-red-600" : "text-emerald-600"}`}>
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
    OPEN: "bg-blue-100 text-blue-700",
    PARTIALLY_FILLED: "bg-yellow-100 text-yellow-700",
    FILLED: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-gray-100 text-gray-500",
  };
  const labels: Record<string, string> = {
    OPEN: "Ouvert",
    PARTIALLY_FILLED: "Partiel",
    FILLED: "Exécuté",
    CANCELLED: "Annulé",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || ""}`}>
      {labels[status] || status}
    </span>
  );
}
