"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { Battery, StorageOffer } from "@/types";

export default function MarketplacePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [offers, setOffers] = useState<StorageOffer[]>([]);
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    loadData();
  }, [user, authLoading, router]);

  async function loadData() {
    setLoading(true);
    try {
      const [offersRes, priceRes] = await Promise.all([
        api.get("/storage/marketplace"),
        api.get("/storage/price"),
      ]);
      setOffers(offersRes.data);
      setPrice(priceRes.data.pricePerKwh);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Marketplace</h1>
        {price !== null && (
          <div className="rounded-lg bg-blue-50 px-4 py-2 text-sm">
            Prix dynamique actuel :{" "}
            <span className="font-bold text-blue-700">
              {price.toFixed(3)} €/kWh
            </span>
          </div>
        )}
      </div>

      {user?.type === "HOST" && <CreateOfferForm onCreated={loadData} />}

      <section className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">
          Offres disponibles ({offers.length})
        </h2>

        {offers.length === 0 ? (
          <p className="text-sm text-gray-400">
            Aucune offre disponible pour le moment.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                isClient={user?.type === "CLIENT"}
                onReserved={loadData}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function CreateOfferForm({ onCreated }: { onCreated: () => void }) {
  const [batteries, setBatteries] = useState<Battery[]>([]);
  const [batteryId, setBatteryId] = useState("");
  const [capacityKwh, setCapacityKwh] = useState("");
  const [pricePerKwh, setPricePerKwh] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.get<Battery[]>("/users/me/batteries").then(({ data }) => {
      setBatteries(data);
      if (data.length > 0) setBatteryId(data[0].id);
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await api.post("/storage/offers", {
        batteryId,
        capacityKwh: parseFloat(capacityKwh),
        pricePerKwh: pricePerKwh ? parseFloat(pricePerKwh) : undefined,
      });
      setSuccess("Offre publiée !");
      setCapacityKwh("");
      setPricePerKwh("");
      onCreated();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erreur"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left font-semibold"
      >
        Publier une offre
        <span className="text-gray-400">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-600">{success}</p>
          )}

          {batteries.length === 0 ? (
            <p className="text-sm text-gray-500">
              Vous devez d&apos;abord ajouter une batterie dans votre profil.
            </p>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Batterie
                </label>
                <select
                  value={batteryId}
                  onChange={(e) => setBatteryId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  {batteries.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label} ({b.availableKwh.toFixed(1)} kWh dispo)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Capacité (kWh)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={capacityKwh}
                    onChange={(e) => setCapacityKwh(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="ex: 5"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Prix/kWh (€, optionnel)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={pricePerKwh}
                    onChange={(e) => setPricePerKwh(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="auto"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Publication..." : "Publier l'offre"}
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
}

function OfferCard({
  offer,
  isClient,
  onReserved,
}: {
  offer: StorageOffer & { battery?: { label: string }; host?: { name: string } };
  isClient: boolean;
  onReserved: () => void;
}) {
  const [requestedKwh, setRequestedKwh] = useState("");
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleReserve(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setReserving(true);
    try {
      await api.post("/storage/reserve", {
        offerId: offer.id,
        requestedKwh: parseFloat(requestedKwh),
      });
      setSuccess("Réservation effectuée !");
      setRequestedKwh("");
      onReserved();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erreur"));
    } finally {
      setReserving(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="font-semibold">{offer.battery?.label ?? "Batterie"}</p>
          <p className="text-sm text-gray-500">par {offer.host?.name ?? "Hôte"}</p>
        </div>
        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
          Actif
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-gray-500">Disponible</p>
          <p className="font-medium">{offer.remainingKwh.toFixed(1)} kWh</p>
        </div>
        <div>
          <p className="text-gray-500">Prix</p>
          <p className="font-medium">{offer.pricePerKwh.toFixed(3)} €/kWh</p>
        </div>
      </div>

      {isClient && (
        <form onSubmit={handleReserve} className="space-y-2">
          {error && <p className="text-xs text-red-600">{error}</p>}
          {success && <p className="text-xs text-green-600">{success}</p>}
          <div className="flex gap-2">
            <input
              type="number"
              step="0.1"
              min="0.1"
              max={offer.remainingKwh}
              required
              value={requestedKwh}
              onChange={(e) => setRequestedKwh(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              placeholder="kWh"
            />
            <button
              type="submit"
              disabled={reserving}
              className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {reserving ? "..." : "Réserver"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
