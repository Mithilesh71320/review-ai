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

/**
 * Prefetch only cheap JSON APIs.
 * Never prefetch /api/insights — that path calls Gemini and can take minutes.
 */
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
        staleTime: 30_000,
      });

      if (cancelled) {
        return;
      }

      const businessId = settings.businesses[0]?.id ?? null;

      // Prefetch the page the user is on first, then siblings (not AI insights).
      const pagePrefetch: Array<Promise<unknown>> = [];

      if (pathname.startsWith("/dashboard") || pathname === "/dashboard") {
        pagePrefetch.push(
          queryClient.prefetchQuery({
            queryKey: queryKeys.dashboard(businessId),
            queryFn: () =>
              fetchJson(withBusiness("/api/dashboard", businessId), { cache: "no-store" }),
            staleTime: 15_000,
          }),
        );
      } else if (pathname.startsWith("/reviews")) {
        pagePrefetch.push(
          queryClient.prefetchQuery({
            queryKey: queryKeys.reviews(businessId),
            queryFn: () =>
              fetchJson(withBusiness("/api/reviews", businessId), { cache: "no-store" }),
            staleTime: 15_000,
          }),
        );
      } else if (pathname.startsWith("/alerts")) {
        pagePrefetch.push(
          queryClient.prefetchQuery({
            queryKey: queryKeys.alerts(businessId),
            queryFn: () =>
              fetchJson(withBusiness("/api/alerts", businessId), { cache: "no-store" }),
            staleTime: 15_000,
          }),
        );
      }

      await Promise.allSettled(pagePrefetch);

      if (cancelled) return;

      // Warm related pages in the background (still no insights).
      void Promise.allSettled([
        queryClient.prefetchQuery({
          queryKey: queryKeys.dashboard(businessId),
          queryFn: () =>
            fetchJson(withBusiness("/api/dashboard", businessId), { cache: "no-store" }),
          staleTime: 15_000,
        }),
        queryClient.prefetchQuery({
          queryKey: queryKeys.reviews(businessId),
          queryFn: () =>
            fetchJson(withBusiness("/api/reviews", businessId), { cache: "no-store" }),
          staleTime: 15_000,
        }),
        queryClient.prefetchQuery({
          queryKey: queryKeys.alerts(businessId),
          queryFn: () =>
            fetchJson(withBusiness("/api/alerts", businessId), { cache: "no-store" }),
          staleTime: 15_000,
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
