"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

type SettingsResponse = {
  businesses: Array<{
    id: string;
    name: string;
    placeId: string;
  }>;
};

const dashboardPaths = ["/dashboard", "/reviews", "/alerts", "/billing", "/settings"];

function withBusiness(path: string, managedBusinessId: string | null) {
  return managedBusinessId ? `${path}?managedBusinessId=${managedBusinessId}` : path;
}

export function DashboardPrefetcher() {
  const pathname = usePathname();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!dashboardPaths.some((path) => pathname.startsWith(path))) {
      return;
    }

    let cancelled = false;

    const prefetch = async () => {
      const settings = await queryClient.fetchQuery({
        queryKey: queryKeys.settings,
        queryFn: () => fetchJson<SettingsResponse>("/api/settings", { cache: "no-store" }),
      });

      if (cancelled) {
        return;
      }

      const businessId = settings.businesses[0]?.id ?? null;

      await Promise.allSettled([
        queryClient.prefetchQuery({
          queryKey: queryKeys.dashboard(businessId),
          queryFn: () => fetchJson(withBusiness("/api/dashboard", businessId), { cache: "no-store" }),
        }),
        queryClient.prefetchQuery({
          queryKey: queryKeys.reviews(businessId),
          queryFn: () => fetchJson(withBusiness("/api/reviews", businessId), { cache: "no-store" }),
        }),
        queryClient.prefetchQuery({
          queryKey: queryKeys.alerts(businessId),
          queryFn: () => fetchJson(withBusiness("/api/alerts", businessId), { cache: "no-store" }),
        }),
        queryClient.prefetchQuery({
          queryKey: queryKeys.insights(businessId),
          queryFn: () => fetchJson(withBusiness("/api/insights", businessId), { cache: "no-store" }),
        }),
      ]);
    };

    void prefetch();

    return () => {
      cancelled = true;
    };
  }, [pathname, queryClient]);

  return null;
}
