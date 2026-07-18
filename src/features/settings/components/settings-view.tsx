"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useSearchParams } from "next/navigation";
import { BillingPlanCards } from "@/components/billing-plan-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fetchJson } from "@/lib/api";
import { buildReturnTo, getInitials } from "@/lib/display";
import { queryKeys } from "@/lib/query-keys";
import { getBillingPlans } from "@/lib/billing-plans";
import { emptySettingsResponse, type SettingsResponse } from "@/shared/types/settings";
import { ProfileTab } from "./tabs/profile-tab";
import { BusinessTab } from "./tabs/business-tab";
import { ConnectionsTab } from "./tabs/connections-tab";
import { NotificationsTab } from "./tabs/notifications-tab";
import { AITab } from "./tabs/ai-tab";
import { BillingTab } from "./tabs/billing-tab";

type GoogleBusinessesResponse = {
  connected: boolean;
  businesses: Array<{
    accountName: string;
    locationName: string;
    title: string;
    placeId: string | null;
    address: string | null;
    mapsUri: string | null;
  }>;
};

type GooglePlaceSearchResponse = {
  places: Array<{
    placeId: string;
    name: string;
    address: string | null;
    rating: number | null;
    userRatingCount: number | null;
  }>;
};

type GoogleOAuthStartResponse = { authUrl: string };

const tabs = [
  { id: "profile", label: "Profile" },
  { id: "business", label: "Business Profiles" },
  { id: "connections", label: "Connections" },
  { id: "notifications", label: "Notifications" },
  { id: "ai", label: "AI Config" },
  { id: "billing", label: "Billing" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function SettingsView() {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const billingPlans = getBillingPlans();
  const [activeTab, setActiveTab] = useState<TabId>(tabs[0].id);
  const [draft, setDraft] = useState<SettingsResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [placeSearchQuery, setPlaceSearchQuery] = useState("");
  const [selectionDirty, setSelectionDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "retry">("idle");
  const [newBusiness, setNewBusiness] = useState({ name: "", placeId: "" });
  const latestStateRef = useRef<SettingsResponse>(emptySettingsResponse());
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const settingsQuery = useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => fetchJson<SettingsResponse>("/api/settings", { cache: "no-store" }),
  });

  const googleBusinessesQuery = useQuery({
    queryKey: queryKeys.googleBusinesses,
    queryFn: () => fetchJson<GoogleBusinessesResponse>("/api/google/businesses", { cache: "no-store" }),
  });

  const placeSearchResultsQuery = useQuery({
    queryKey: queryKeys.googlePlaceSearch(placeSearchQuery),
    queryFn: () =>
      fetchJson<GooglePlaceSearchResponse>(
        `/api/google/places/search?query=${encodeURIComponent(placeSearchQuery)}`,
        { cache: "no-store" },
      ),
    enabled: placeSearchQuery.trim().length >= 3,
  });

  const state = draft ?? settingsQuery.data ?? emptySettingsResponse();
  const isGoogleConnected =
    state.sources.some((source) => source.key === "GOOGLE" && source.connected) ||
    googleBusinessesQuery.data?.connected === true;

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  const updateState = (updater: (current: SettingsResponse) => SettingsResponse) => {
    setDraft((currentDraft) => updater(currentDraft ?? settingsQuery.data ?? emptySettingsResponse()));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      await fetchJson<{ ok: true }>("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
    },
    onSuccess: async () => {
      setDraft(null);
      setSelectionDirty(false);
      setMessage("Settings saved.");
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Failed to save settings."),
  });

  const connectGoogleMutation = useMutation({
    mutationFn: async () => {
      const { authUrl } = await fetchJson<GoogleOAuthStartResponse>("/api/google/oauth/start", { cache: "no-store" });
      window.location.assign(authUrl);
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Failed to start Google OAuth."),
  });

  const applyBusinessSelection = (business: SettingsResponse["businesses"][number]) => {
    updateState((current) => ({
      ...current,
      businesses: current.businesses.some((item) => item.placeId === business.placeId)
        ? current.businesses.map((item) => (item.placeId === business.placeId ? { ...item, ...business } : item))
        : [...current.businesses, business],
      sources: current.sources.map((source) => (source.key === "GOOGLE" ? { ...source, connected: true } : source)),
    }));
    setSelectionDirty(true);
    setMessage(`${business.name} added to monitored businesses.`);
  };

  const removeBusiness = (placeId: string) => {
    updateState((current) => ({ ...current, businesses: current.businesses.filter((business) => business.placeId !== placeId) }));
    setSelectionDirty(true);
    setMessage("Business removed from monitored businesses.");
  };

  useEffect(() => {
    const persistPendingBusinessChanges = async () => {
      if (!selectionDirty) return;

      setSaveStatus("saving");
      const payload = latestStateRef.current;

      try {
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        });
        if (res.ok) {
          setSaveStatus("saved");
          setSelectionDirty(false);
        } else {
          throw new Error("Save failed");
        }
      } catch {
        setSaveStatus("retry");
        retryTimerRef.current = setTimeout(() => {
          void persistPendingBusinessChanges();
        }, 5000);
      }
    };

    const handlePageHide = () => {
      void persistPendingBusinessChanges();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void persistPendingBusinessChanges();
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [selectionDirty]);

  const placeSuggestions = placeSearchResultsQuery.data?.places ?? [];
  const hasPaidPlan = state.subscription.hasPaidPlan;
  const maxBusinesses = state.subscription.limits.maxBusinesses;
  const billingHref = buildReturnTo(pathname, searchParams.toString() ? `?${searchParams.toString()}` : "");

  if (settingsQuery.isPending) return <div className="text-sm text-[#78716C]">Loading settings...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] text-[#1C1917]" style={{ fontFamily: "Playfair Display", fontWeight: 600 }}>Settings</h1>
        <p className="mt-1 text-sm text-[#78716C]">Manage your account and preferences</p>
      </div>

      {settingsQuery.error && (
        <div className="rounded-lg border border-[#EF4444]/40 bg-[#FEE2E2] p-4 text-sm text-[#EF4444]">
          {settingsQuery.error instanceof Error ? settingsQuery.error.message : "Failed to load settings"}
        </div>
      )}
      {message && <div className="rounded-lg border border-[#E7E5E4] bg-white p-4 text-sm text-[#1C1917]">{message}</div>}

      <div className="flex w-full flex-wrap justify-start border-b border-[#E7E5E4]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "border-b-2 border-transparent px-4 pb-3 text-sm font-medium text-[#78716C]",
              activeTab === tab.id && "border-[#0D9488] text-[#0D9488]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <ProfileTab state={state} updateState={updateState} saveMutation={saveMutation} />
      )}

      {activeTab === "business" && (
        <BusinessTab
          state={state}
          updateState={updateState}
          hasPaidPlan={hasPaidPlan}
          isGoogleConnected={isGoogleConnected}
          googleBusinesses={googleBusinessesQuery.data?.businesses ?? []}
          placeSuggestions={placeSuggestions}
          placeSearchQuery={placeSearchQuery}
          setPlaceSearchQuery={setPlaceSearchQuery}
          newBusiness={newBusiness}
          setNewBusiness={setNewBusiness}
          applyBusinessSelection={applyBusinessSelection}
          removeBusiness={removeBusiness}
          connectGoogleMutation={connectGoogleMutation}
          billingHref={billingHref}
          maxBusinesses={maxBusinesses}
          saveStatus={saveStatus}
          selectionDirty={selectionDirty}
        />
      )}

      {activeTab === "connections" && <ConnectionsTab state={state} />}

      {activeTab === "notifications" && <NotificationsTab state={state} updateState={updateState} />}

      {activeTab === "ai" && <AITab state={state} updateState={updateState} saveMutation={saveMutation} />}

      {activeTab === "billing" && <BillingTab state={state} billingHref={billingHref} />}
    </div>
  );
}