"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-[80vh] items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </main>
    );
  }

  if (user) {
    return (
      <main className="flex min-h-[80vh] flex-col items-center justify-center gap-6 p-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight">GridShare</h1>
          <p className="mt-3 text-lg text-gray-600">
            Bienvenue, {user.name} !
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Aller au dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight">GridShare</h1>
        <p className="mt-4 text-lg text-gray-600">
          Plateforme de stockage énergétique partagé entre particuliers
        </p>
        <p className="mt-2 max-w-md text-gray-500">
          Louez de la capacité de batterie ou mettez la vôtre à disposition.
          Stockez, restituez et suivez vos flux d&apos;énergie en temps réel.
        </p>
      </div>

      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Se connecter
        </Link>
        <Link
          href="/register"
          className="rounded-lg border border-gray-300 px-6 py-3 font-medium hover:bg-gray-100 transition-colors"
        >
          Créer un compte
        </Link>
      </div>
    </main>
  );
}
