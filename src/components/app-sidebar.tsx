"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CreditCard, LayoutGrid, Scissors, Settings, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/dashboard", icon: LayoutGrid, label: "Dashboard" },
  { path: "/reviews", icon: Star, label: "Reviews" },
  { path: "/alerts", icon: Bell, label: "Alerts" },
  { path: "/billing", icon: CreditCard, label: "Billing" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-[#E7E5E4] bg-[#F8F6F1] md:flex">
      <div className="flex h-16 items-center border-b border-[#E7E5E4] px-6">
        <div className="flex items-center gap-2">
          <Scissors className="h-5 w-5 text-[#0D9488]" />
          <div>
            <div className="font-bold text-[#0D9488]" style={{ fontFamily: "Inter" }}>
              ReviewAI
            </div>
            <div className="text-[10px] uppercase tracking-wide text-[#78716C]">
              for Salons & Spas
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.path;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                active
                  ? "bg-[#0D9488] text-white"
                  : "text-[#78716C] hover:bg-[#F0FDF9]",
              )}
              style={{ fontFamily: "Inter" }}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-[#E7E5E4] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0D9488] text-sm text-white">
            JD
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm" style={{ fontFamily: "Inter" }}>
              John Doe
            </div>
            <Badge
              variant="secondary"
              className="border-0 bg-[#FEF3C7] text-xs text-[#D97706]"
            >
              Free Plan
            </Badge>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full border-[#0D9488] text-[#0D9488] hover:bg-[#F0FDF9]"
          asChild
        >
          <Link href="/billing">Upgrade</Link>
        </Button>
      </div>
    </aside>
  );
}

