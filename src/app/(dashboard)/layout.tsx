import type { ReactNode } from "react";
import Link from "next/link";
import { RedirectToSignIn, Show } from "@clerk/nextjs";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/reviews", label: "Reviews" },
  { href: "/alerts", label: "Alerts" },
  { href: "/settings", label: "Settings" },
  { href: "/sign-out", label: "Sign out" },
];

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
      <Show when="signed-in">
        <div className="min-h-screen bg-slate-100 text-slate-900">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6 lg:flex-row">
            <aside className="w-full rounded-2xl bg-white p-5 shadow-sm lg:w-64">
              <h1 className="mb-5 text-xl font-bold">Review AI</h1>
              <nav className="space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </aside>

            <main className="flex-1 rounded-2xl bg-white p-6 shadow-sm">
              {children}
            </main>
          </div>
        </div>
      </Show>
    </>
  );
}
