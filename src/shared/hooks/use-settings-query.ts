"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { SettingsResponse, WorkspaceSettingsSummary } from "@/shared/types/settings";

/** Full settings document (Settings page, sidebar). */
export function useSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => fetchJson<SettingsResponse>("/api/settings", { cache: "no-store" }),
  });
}

/** Lightweight settings slice used by dashboard feature pages. */
export function useWorkspaceSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => fetchJson<WorkspaceSettingsSummary>("/api/settings", { cache: "no-store" }),
  });
}
