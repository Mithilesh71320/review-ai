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
 *
 * Performance strategy:
 * 1. Wait for settings to be in the React Query cache (avoids a duplicate fetch).
 * 2. Prefetch the current page's data first.
 * 3. Defer sibling-page prefetches to `requestIdleCallback` so they never
 *    compete with the LCP request on free-tier Neon / local dev.
 */
export function DashboardPrefetcher() {
  const pathname = usePathname();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!dashboardPaths.some((path) => pathname.startsWith(path))) {
      return;
    }

    let cancelled = false;
    let idleHandle: number | undefined;

    const prefetch = async () => {
      // Re-use the settings from the React Query cache instead of issuing
      // another fetch that competes with the dashboard query.
      const settings = await queryClient.fetchQuery({
        queryKey: queryKeys.settings,
        queryFn: () => fetchJson<SettingsResponse>("/api/settings", { cache: "no-store" }),
        staleTime: 30_000,
      });

      if (cancelled) return;

      const businessId = settings.businesses[0]?.id ?? null;

      // ── Step 1: prefetch only the data for the page the user is actually on ──
      if (pathname.startsWith("/dashboard") || pathname === "/dashboard") {
        await queryClient.prefetchQuery({
          queryKey: queryKeys.dashboard(businessId, 30),
          queryFn: () =>
            fetchJson(`${withBusiness("/api/dashboard", businessId)}${
              businessId ? "&" : "?"
            }trendDays=30`, { cache: "no-store" }),
          staleTime: 15_000,
        });
      } else if (pathname.startsWith("/reviews")) {
        await queryClient.prefetchInfiniteQuery({
          queryKey: queryKeys.reviews(businessId),
          queryFn: () =>
            fetchJson(`${withBusiness("/api/reviews", businessId)}${
              businessId ? "&" : "?"
            }limit=25`, { cache: "no-store" }),
          initialPageParam: null,
          staleTime: 15_000,
        });
      } else if (pathname.startsWith("/alerts")) {
        await queryClient.prefetchInfiniteQuery({
          queryKey: queryKeys.alerts(businessId),
          queryFn: () =>
            fetchJson(`${withBusiness("/api/alerts", businessId)}${
              businessId ? "&" : "?"
            }limit=25`, { cache: "no-store" }),
          initialPageParam: null,
          staleTime: 15_000,
        });
      }

      if (cancelled) return;

      // ── Step 2: warm sibling pages only when the browser is idle ──
      // This prevents background prefetches from competing with LCP.
      const scheduleIdle =
        typeof window !== "undefined" && "requestIdleCallback" in window
          ? window.requestIdleCallback
          : (cb: () => void) => window.setTimeout(cb, 2000);

      idleHandle = scheduleIdle(() => {
        if (cancelled) return;

        void Promise.allSettled([
          queryClient.prefetchQuery({
            queryKey: queryKeys.dashboard(businessId, 30),
            queryFn: () =>
              fetchJson(`${withBusiness("/api/dashboard", businessId)}${
                businessId ? "&" : "?"
              }trendDays=30`, { cache: "no-store" }),
            staleTime: 15_000,
          }),
          queryClient.prefetchInfiniteQuery({
            queryKey: queryKeys.reviews(businessId),
            queryFn: () =>
              fetchJson(`${withBusiness("/api/reviews", businessId)}${
                businessId ? "&" : "?"
              }limit=25`, { cache: "no-store" }),
            initialPageParam: null,
            staleTime: 15_000,
          }),
          queryClient.prefetchInfiniteQuery({
            queryKey: queryKeys.alerts(businessId),
            queryFn: () =>
              fetchJson(`${withBusiness("/api/alerts", businessId)}${
                businessId ? "&" : "?"
              }limit=25`, { cache: "no-store" }),
            initialPageParam: null,
            staleTime: 15_000,
          }),
        ]);
      }) as unknown as number;
    };

    void prefetch();

    return () => {
      cancelled = true;
      if (idleHandle !== undefined) {
        if (typeof window !== "undefined" && "cancelIdleCallback" in window) {
          window.cancelIdleCallback(idleHandle);
        } else {
          clearTimeout(idleHandle);
        }
      }
    };
  }, [pathname, queryClient]);

  return null;
}
