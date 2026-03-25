"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const { user, loading, logout } = useAuth();

  if (loading) return null;

  if (!user) {
    return (
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-xl font-bold text-blue-600">
            GridShare
          </Link>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Inscription
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-xl font-bold text-blue-600">
            GridShare
          </Link>
          <div className="flex gap-1">
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/marketplace">Marketplace</NavLink>
            <NavLink href="/trading">Énergie</NavLink>
            <NavLink href="/monitoring/account">Mon Monitoring</NavLink>
            <NavLink href="/monitoring">Plateforme</NavLink>
            <NavLink href="/profile">Profil</NavLink>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {user.name}{" "}
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {user.type === "HOST" ? "Hôte" : "Client"}
            </span>
          </span>
          <button
            onClick={logout}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
    >
      {children}
    </Link>
  );
}
