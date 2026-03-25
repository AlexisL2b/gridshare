"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/lib/errors";

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [type, setType] = useState<"HOST" | "CLIENT">("CLIENT");
  const [estimatedProduction, setEstimatedProduction] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(
        email,
        password,
        name,
        type,
        estimatedProduction ? parseFloat(estimatedProduction) : undefined
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erreur lors de l'inscription"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-3xl font-bold">Inscription</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium">
              Nom
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Jean Dupont"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="vous@exemple.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Min. 6 caractères"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Type de compte</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("CLIENT")}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  type === "CLIENT"
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Client
                <span className="mt-0.5 block text-xs font-normal opacity-70">
                  Stocker mon surplus
                </span>
              </button>
              <button
                type="button"
                onClick={() => setType("HOST")}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  type === "HOST"
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Hôte
                <span className="mt-0.5 block text-xs font-normal opacity-70">
                  Louer ma batterie
                </span>
              </button>
            </div>
          </div>

          {type === "HOST" && (
            <div>
              <label
                htmlFor="production"
                className="mb-1 block text-sm font-medium"
              >
                Production estimée (kW)
              </label>
              <input
                id="production"
                type="number"
                step="0.1"
                min="0"
                value={estimatedProduction}
                onChange={(e) => setEstimatedProduction(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="ex: 6.5"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Déjà inscrit ?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
