"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchJson } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

type AlertsResponse = {
  unreadCount: number;
};

type SettingsResponse = {
  businesses: Array<{
    id: string;
  }>;
};

export function DashboardHeaderControls() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data: settings } = useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => fetchJson<SettingsResponse>("/api/settings", { cache: "no-store" }),
  });

  const businessId = settings?.businesses[0]?.id ?? null;

  const { data: alerts } = useQuery({
    queryKey: queryKeys.alerts(businessId),
    queryFn: () =>
      fetchJson<AlertsResponse>(
        `/api/alerts${businessId ? `?managedBusinessId=${businessId}` : ""}`,
        { cache: "no-store" },
      ),
    enabled: pathname !== "/billing",
  });

  const unreadCount = alerts?.unreadCount ?? 0;
  const returnBack = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  return (
    <div className="flex items-center gap-4">
      <Button variant="ghost" size="icon" className="relative" asChild>
        <Link href="/alerts" aria-label="Open alerts">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <>
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#EF4444]" />
              <span className="sr-only">{unreadCount} unread alerts</span>
            </>
          )}
        </Link>
      </Button>
      <UserButton
        appearance={{
          elements: {
            userButtonAvatarBox: "h-8 w-8",
          },
        }}
        userProfileMode="navigation"
        userProfileUrl={`/settings?returnTo=${encodeURIComponent(returnBack)}`}
      />
    </div>
  );
}
