"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { Battery, StorageContract } from "@/types";

export default function ProfilePage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Mon profil</h1>

      <div className="space-y-6">
        <ProfileInfo user={user} onUpdated={refreshUser} />

        {user.type === "HOST" && <BatteriesSection />}

        {user.type === "HOST" && <HostOffersSection />}

        {user.type === "CLIENT" && <ClientContractsSection />}
      </div>
    </main>
  );
}

function ProfileInfo({
  user,
  onUpdated,
}: {
  user: { name: string; email: string; type: string; estimatedProduction: number };
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [production, setProduction] = useState(String(user.estimatedProduction));
  const [saving, setSaving] = useState(false);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/users/me", {
        name,
        estimatedProduction: parseFloat(production) || 0,
      });
      await onUpdated();
      setEditing(false);
    } catch {
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Informations</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-blue-600 hover:underline"
          >
            Modifier
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Nom</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Production estimée (kW)
            </label>
            <input
              type="number"
              step="0.1"
              value={production}
              onChange={(e) => setProduction(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "..." : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Nom</p>
            <p className="font-medium">{user.name}</p>
          </div>
          <div>
            <p className="text-gray-500">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-gray-500">Type</p>
            <p className="font-medium">
              {user.type === "HOST" ? "Hôte" : "Client"}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Production estimée</p>
            <p className="font-medium">{user.estimatedProduction} kW</p>
          </div>
        </div>
      )}
    </div>
  );
}

function BatteriesSection() {
  const [batteries, setBatteries] = useState<Battery[]>([]);
  const [label, setLabel] = useState("");
  const [capacityKwh, setCapacityKwh] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadBatteries();
  }, []);

  function loadBatteries() {
    api.get<Battery[]>("/users/me/batteries").then(({ data }) => setBatteries(data));
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError("");
    setAdding(true);
    try {
      await api.post("/users/me/batteries", {
        label,
        capacityKwh: parseFloat(capacityKwh),
      });
      setLabel("");
      setCapacityKwh("");
      loadBatteries();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erreur"));
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 text-lg font-semibold">Mes batteries</h2>

      {batteries.length > 0 ? (
        <div className="mb-4 divide-y divide-gray-100">
          {batteries.map((b) => (
            <div key={b.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{b.label}</p>
                <p className="text-sm text-gray-500">
                  {b.availableKwh.toFixed(1)} / {b.capacityKwh.toFixed(1)} kWh
                  disponible
                </p>
              </div>
              <div className="text-right text-sm">
                <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-green-500"
                    style={{
                      width: `${(b.availableKwh / b.capacityKwh) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-4 text-sm text-gray-400">Aucune batterie ajoutée.</p>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
        {error && <p className="w-full text-sm text-red-600">{error}</p>}
        <input
          type="text"
          required
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          placeholder="Nom de la batterie"
        />
        <input
          type="number"
          step="0.1"
          min="0.1"
          required
          value={capacityKwh}
          onChange={(e) => setCapacityKwh(e.target.value)}
          className="w-28 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          placeholder="kWh"
        />
        <button
          type="submit"
          disabled={adding}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {adding ? "..." : "Ajouter"}
        </button>
      </form>
    </div>
  );
}

interface OfferWithBattery {
  id: string;
  capacityKwh: number;
  remainingKwh: number;
  pricePerKwh: number;
  status: string;
  battery?: { label: string };
}

function HostOffersSection() {
  const [offers, setOffers] = useState<OfferWithBattery[]>([]);

  useEffect(() => {
    api.get("/storage/my-offers").then(({ data }) => setOffers(data));
  }, []);

  if (offers.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 text-lg font-semibold">Mes offres de stockage</h2>
      <div className="divide-y divide-gray-100">
        {offers.map((o) => (
          <div key={o.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">
                {o.battery?.label} -- {o.capacityKwh.toFixed(1)} kWh
              </p>
              <p className="text-sm text-gray-500">
                Restant : {o.remainingKwh.toFixed(1)} kWh | {o.pricePerKwh.toFixed(3)} €/kWh
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                o.status === "ACTIVE"
                  ? "bg-green-100 text-green-700"
                  : o.status === "FULL"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-gray-100 text-gray-600"
              }`}
            >
              {o.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ContractWithOffer extends StorageContract {
  offer: { id: string; host?: { name: string } };
}

function ClientContractsSection() {
  const [contracts, setContracts] = useState<ContractWithOffer[]>([]);
  const [actionContract, setActionContract] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"STORE" | "RESTORE">("STORE");
  const [amountKwh, setAmountKwh] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadContracts();
  }, []);

  function loadContracts() {
    api.get("/storage/my-contracts").then(({ data }) => setContracts(data));
  }

  async function handleAction(e: FormEvent) {
    e.preventDefault();
    if (!actionContract) return;
    setActionError("");
    setActionSuccess("");
    setSubmitting(true);
    try {
      const endpoint =
        actionType === "STORE" ? "/transactions/store" : "/transactions/restore";
      await api.post(endpoint, {
        contractId: actionContract,
        amountKwh: parseFloat(amountKwh),
      });
      setActionSuccess(
        actionType === "STORE" ? "Énergie stockée !" : "Énergie restituée !"
      );
      setAmountKwh("");
      loadContracts();
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, "Erreur"));
    } finally {
      setSubmitting(false);
    }
  }

  if (contracts.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-2 text-lg font-semibold">Mes contrats</h2>
        <p className="text-sm text-gray-400">
          Aucun contrat. Réservez du stockage sur la marketplace.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 text-lg font-semibold">Mes contrats</h2>

      <div className="space-y-3">
        {contracts.map((c) => (
          <div key={c.id} className="rounded-lg border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {c.allocatedKwh.toFixed(1)} kWh réservés
                  {c.offer?.host?.name && (
                    <span className="text-gray-500"> chez {c.offer.host.name}</span>
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  Stocké : {c.usedKwh.toFixed(1)} / {c.allocatedKwh.toFixed(1)} kWh |{" "}
                  {c.pricePerKwh.toFixed(3)} €/kWh
                </p>
                <div className="mt-1 h-2 w-40 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{
                      width: `${(c.usedKwh / c.allocatedKwh) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  c.status === "ACTIVE"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {c.status}
              </span>
            </div>

            {c.status === "ACTIVE" && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                {actionContract === c.id ? (
                  <form onSubmit={handleAction} className="space-y-2">
                    {actionError && (
                      <p className="text-xs text-red-600">{actionError}</p>
                    )}
                    {actionSuccess && (
                      <p className="text-xs text-green-600">{actionSuccess}</p>
                    )}
                    <div className="flex gap-2">
                      <select
                        value={actionType}
                        onChange={(e) =>
                          setActionType(e.target.value as "STORE" | "RESTORE")
                        }
                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                      >
                        <option value="STORE">Stocker</option>
                        <option value="RESTORE">Restituer</option>
                      </select>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        required
                        value={amountKwh}
                        onChange={(e) => setAmountKwh(e.target.value)}
                        className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                        placeholder="kWh"
                      />
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {submitting ? "..." : "OK"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActionContract(null);
                          setActionError("");
                          setActionSuccess("");
                        }}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => {
                      setActionContract(c.id);
                      setActionError("");
                      setActionSuccess("");
                    }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Stocker / Restituer
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
