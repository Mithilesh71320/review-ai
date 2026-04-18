"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { BillingPlanCards } from "@/components/billing-plan-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { fetchJson } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { getBillingPlans } from "@/lib/billing-plans";

type SettingsResponse = {
  business: { name: string; email: string; phone: string; website: string; placeId: string };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    weeklyDigest: boolean;
  };
  ai: { provider: string; sentimentModel: string; analysisLanguage: string; autoRespond: boolean };
  sources: Array<{ source: string; key: "GOOGLE" | "YELP" | "FACEBOOK" | "TRIPADVISOR"; connected: boolean }>;
  businesses: Array<{ id?: string; name: string; placeId: string; accountName?: string | null; locationName?: string | null; mapsUri?: string | null }>;
};

type GoogleBusinessesResponse = {
  connected: boolean;
  businesses: Array<{ accountName: string; locationName: string; title: string; placeId: string | null; address: string | null; mapsUri: string | null }>;
};

type GooglePlaceSearchResponse = {
  places: Array<{ placeId: string; name: string; address: string | null; rating: number | null; userRatingCount: number | null }>;
};

type GoogleOAuthStartResponse = { authUrl: string };

const initialState: SettingsResponse = {
  business: { name: "", email: "", phone: "", website: "", placeId: "" },
  notifications: { emailNotifications: true, pushNotifications: true, smsNotifications: false, weeklyDigest: true },
  ai: { provider: "gemini", sentimentModel: "balanced", analysisLanguage: "en", autoRespond: true },
  sources: [],
  businesses: [],
};

const tabs = [
  { id: "profile", label: "Profile" },
  { id: "business", label: "Business Profiles" },
  { id: "connections", label: "Connections" },
  { id: "notifications", label: "Notifications" },
  { id: "ai", label: "AI Config" },
  { id: "billing", label: "Billing" },
];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const billingPlans = getBillingPlans();
  const [activeTab, setActiveTab] = useState("profile");
  const [draft, setDraft] = useState<SettingsResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [placeSearchQuery, setPlaceSearchQuery] = useState("");
  const [selectionDirty, setSelectionDirty] = useState(false);
  const [newBusiness, setNewBusiness] = useState({ name: "", placeId: "" });

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
      fetchJson<GooglePlaceSearchResponse>(`/api/google/places/search?query=${encodeURIComponent(placeSearchQuery)}`, { cache: "no-store" }),
    enabled: placeSearchQuery.trim().length >= 3,
  });

  const state = draft ?? settingsQuery.data ?? initialState;

  const updateState = (updater: (current: SettingsResponse) => SettingsResponse) => {
    setDraft((currentDraft) => updater(currentDraft ?? settingsQuery.data ?? initialState));
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      fetchJson<{ ok: true }>("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      }),
    onSuccess: async () => {
      setDraft(null);
      setSelectionDirty(false);
      setMessage("Settings saved.");
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Failed to save settings."),
  });

  const connectGoogleMutation = useMutation({
    mutationFn: () => fetchJson<GoogleOAuthStartResponse>("/api/google/oauth/start", { cache: "no-store" }),
    onSuccess: ({ authUrl }) => window.location.assign(authUrl),
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

  const placeSuggestions = placeSearchResultsQuery.data?.places ?? [];

  if (settingsQuery.isPending) return <div className="text-sm text-[#78716C]">Loading settings...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] text-[#1C1917]" style={{ fontFamily: "Playfair Display", fontWeight: 600 }}>Settings</h1>
        <p className="mt-1 text-sm text-[#78716C]">Manage your account and preferences</p>
      </div>

      {settingsQuery.error && <div className="rounded-lg border border-[#EF4444]/40 bg-[#FEE2E2] p-4 text-sm text-[#EF4444]">{settingsQuery.error instanceof Error ? settingsQuery.error.message : "Failed to load settings"}</div>}
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
        <div className="space-y-6">
          <Card className="rounded-xl border-[#E7E5E4] bg-white p-6">
            <div className="space-y-6">
              <div className="flex flex-col gap-6 md:flex-row">
                <div className="relative h-20 w-20 shrink-0">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#0D9488] text-2xl text-white">JD</div>
                  <button className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#0D9488] hover:bg-[#134E4A]">
                    <Camera className="h-3 w-3 text-white" />
                  </button>
                </div>
                <div className="grid flex-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullname" className="text-sm">Full Name</Label>
                    <Input id="fullname" value={state.business.name} onChange={(event) => updateState((current) => ({ ...current, business: { ...current.business, name: event.target.value } }))} className="rounded-lg border-[#E7E5E4]" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm">Phone</Label>
                    <Input id="phone" value={state.business.phone} onChange={(event) => updateState((current) => ({ ...current, business: { ...current.business, phone: event.target.value } }))} className="rounded-lg border-[#E7E5E4]" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <div className="flex gap-2">
                  <Input id="email" value={state.business.email} onChange={(event) => updateState((current) => ({ ...current, business: { ...current.business, email: event.target.value } }))} className="flex-1 rounded-lg border-[#E7E5E4]" />
                  <Badge variant="secondary" className="flex h-10 items-center border-0 bg-[#F8F6F1] px-3 text-[#78716C]">User Profile</Badge>
                </div>
              </div>
            </div>
          </Card>
          <div className="flex justify-end">
            <Button className="bg-[#0D9488] text-white hover:bg-[#134E4A]" disabled={saveMutation.isPending} onClick={() => void saveMutation.mutateAsync()}>
              {saveMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      )}

      {activeTab === "business" && (
        <div className="space-y-6">
          {state.businesses.map((business) => (
            <Card key={business.id ?? business.placeId} className="rounded-xl border-[#E7E5E4] bg-white p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h3 className="text-base font-semibold">{business.name}</h3>
                  <p className="font-mono text-xs text-[#78716C]">Place ID: {business.placeId}</p>
                  <Badge className="border-0 bg-[#10B981] text-white">Google Connected</Badge>
                </div>
                <Button variant="ghost" size="icon" className="text-[#EF4444]" onClick={() => removeBusiness(business.placeId)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}

          <Card className="rounded-xl border-[#E7E5E4] bg-white p-6">
            <h3 className="mb-4 text-base font-semibold">Add New Business</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="business-name" className="text-sm">Business Name</Label>
                <Input id="business-name" placeholder="Enter name" value={newBusiness.name} onChange={(event) => setNewBusiness((current) => ({ ...current, name: event.target.value }))} className="rounded-lg border-[#E7E5E4]" />
              </div>
              <div className="relative space-y-2">
                <Label htmlFor="google-search" className="text-sm">Search Google Places</Label>
                <Input id="google-search" placeholder="Search..." value={placeSearchQuery} onChange={(event) => setPlaceSearchQuery(event.target.value)} className="rounded-lg border-[#E7E5E4]" />
                {placeSearchQuery.trim().length >= 3 && (
                  <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-[#E7E5E4] bg-white shadow-lg">
                    {placeSearchResultsQuery.isFetching && <div className="px-4 py-3 text-sm text-[#78716C]">Searching...</div>}
                    {placeSearchResultsQuery.error && <div className="px-4 py-3 text-sm text-[#EF4444]">{placeSearchResultsQuery.error instanceof Error ? placeSearchResultsQuery.error.message : "Search failed"}</div>}
                    {placeSuggestions.map((place) => (
                      <button key={place.placeId} type="button" className="block w-full border-b border-[#E7E5E4] px-4 py-3 text-left last:border-0 hover:bg-[#F0FDF9]" onClick={() => { setNewBusiness({ name: place.name, placeId: place.placeId }); setPlaceSearchQuery(""); }}>
                        <p className="text-sm font-semibold text-[#1C1917]">{place.name}</p>
                        <p className="text-xs text-[#78716C]">{place.address ?? "No address available"}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="place-id" className="text-sm">Place ID</Label>
                <Input id="place-id" placeholder="Auto-filled" value={newBusiness.placeId} onChange={(event) => setNewBusiness((current) => ({ ...current, placeId: event.target.value }))} className="rounded-lg border-[#E7E5E4]" />
              </div>
            </div>
            <Button className="mt-4 bg-[#0D9488] text-white hover:bg-[#134E4A]" onClick={() => {
              if (!newBusiness.name.trim() || !newBusiness.placeId.trim()) { setMessage("Business name and place ID are required."); return; }
              applyBusinessSelection({ name: newBusiness.name.trim(), placeId: newBusiness.placeId.trim() });
              setNewBusiness({ name: "", placeId: "" });
            }}>
              <Plus className="mr-2 h-4 w-4" /> Add Business
            </Button>
          </Card>

          <Card className="rounded-xl border-[#0D9488] bg-[#F0FDF9] p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white font-bold text-[#4285F4]">G</div>
              <div className="flex-1">
                <h3 className="text-base font-semibold">Connect Google Account</h3>
                <p className="text-sm text-[#78716C]">Link your Google Business Profile to sync reviews automatically</p>
              </div>
              <Button className="bg-[#0D9488] text-white hover:bg-[#134E4A]" disabled={connectGoogleMutation.isPending} onClick={() => void connectGoogleMutation.mutateAsync()}>
                {connectGoogleMutation.isPending ? "Connecting..." : "Connect"}
              </Button>
            </div>
          </Card>

          {googleBusinessesQuery.data?.businesses.length ? (
            <div className="space-y-3">
              {googleBusinessesQuery.data.businesses.map((business) => (
                <button key={business.locationName} className="w-full rounded-xl border border-[#E7E5E4] bg-white p-4 text-left hover:bg-[#F0FDF9]" onClick={() => business.placeId && applyBusinessSelection({ name: business.title, placeId: business.placeId, accountName: business.accountName, locationName: business.locationName, mapsUri: business.mapsUri })}>
                  <p className="font-semibold text-[#1C1917]">{business.title}</p>
                  <p className="text-sm text-[#78716C]">{business.address ?? business.accountName}</p>
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => void googleBusinessesQuery.refetch()}>Refresh Google Businesses</Button>
            <Button className="bg-[#0D9488] text-white hover:bg-[#134E4A]" disabled={saveMutation.isPending || !selectionDirty} onClick={() => void saveMutation.mutateAsync()}>
              {saveMutation.isPending ? "Saving..." : "Save Business List"}
            </Button>
          </div>
        </div>
      )}

      {activeTab === "connections" && (
        <div className="space-y-4">
          {state.sources.map((source) => (
            <Card key={source.key} className="rounded-xl border-[#E7E5E4] bg-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#4285F4]/10">
                    <div className="h-6 w-6 rounded bg-[#4285F4]" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">{source.source}</h3>
                    <p className="text-sm text-[#78716C]">{source.connected ? <span className="text-[#10B981]">Connected · Syncing</span> : "Not connected"}</p>
                  </div>
                </div>
                <Button variant={source.connected ? "outline" : "default"} className={!source.connected ? "bg-[#0D9488] text-white hover:bg-[#134E4A]" : ""}>{source.connected ? "Disconnect" : "Connect"}</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "notifications" && (
        <Card className="rounded-xl border-[#E7E5E4] bg-white p-6">
          <div className="space-y-4">
            {[
              ["emailNotifications", "New review notifications", "Get notified when you receive a new review"],
              ["pushNotifications", "Negative review alerts", "Immediate notification for 1-2 star reviews"],
              ["smsNotifications", "Rating drop alerts", "Alert when your rating decreases"],
              ["weeklyDigest", "Weekly summary", "Receive a weekly digest of your review activity"],
            ].map(([key, label, description]) => (
              <div key={key} className="flex items-center justify-between border-b border-[#E7E5E4] py-3 last:border-0">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-[#78716C]">{description}</p>
                </div>
                <Switch checked={state.notifications[key as keyof SettingsResponse["notifications"]]} onCheckedChange={(checked) => updateState((current) => ({ ...current, notifications: { ...current.notifications, [key]: checked } }))} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === "ai" && (
        <div className="space-y-6">
          <Card className="rounded-xl border-[#E7E5E4] bg-white p-6">
            <div className="space-y-6">
              <div>
                <h3 className="mb-4 text-base font-semibold">AI Provider</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {["gemini", "openai"].map((provider) => (
                    <button key={provider} className={cn("rounded-lg border-2 p-4 text-left transition-colors", state.ai.provider === provider ? "border-[#0D9488] bg-[#F0FDF9]" : "border-[#E7E5E4] bg-white hover:border-[#0D9488]")} onClick={() => updateState((current) => ({ ...current, ai: { ...current.ai, provider } }))}>
                      <div className="text-base font-semibold capitalize">{provider}</div>
                      <p className="mt-1 text-xs text-[#78716C]">{provider === "gemini" ? "Google's AI model" : "GPT powered"}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-4 text-base font-semibold">Sentiment Model</h3>
                <div className="flex flex-wrap gap-2">
                  {["conservative", "balanced", "aggressive"].map((mode) => (
                    <Button key={mode} variant={state.ai.sentimentModel === mode ? "default" : "outline"} className={state.ai.sentimentModel === mode ? "bg-[#0D9488] text-white" : ""} onClick={() => updateState((current) => ({ ...current, ai: { ...current.ai, sentimentModel: mode } }))}>
                      {mode[0].toUpperCase() + mode.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="language" className="mb-3 block text-sm">Response Language</Label>
                <Select value={state.ai.analysisLanguage} onValueChange={(value) => updateState((current) => ({ ...current, ai: { ...current.ai, analysisLanguage: value } }))}>
                  <SelectTrigger className="rounded-lg border-[#E7E5E4]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">Auto-draft responses</p>
                  <p className="text-xs text-[#78716C]">Automatically generate reply suggestions</p>
                </div>
                <Switch checked={state.ai.autoRespond} onCheckedChange={(checked) => updateState((current) => ({ ...current, ai: { ...current.ai, autoRespond: checked } }))} />
              </div>
            </div>
          </Card>
          <div className="flex justify-end">
            <Button className="bg-[#0D9488] text-white hover:bg-[#134E4A]" onClick={() => void saveMutation.mutateAsync()} disabled={saveMutation.isPending}>Save Changes</Button>
          </div>
        </div>
      )}

      {activeTab === "billing" && (
        <div className="space-y-6">
          <Card className="rounded-xl bg-gradient-to-br from-[#0D9488] to-[#134E4A] p-6 text-white">
            <h3 className="text-2xl" style={{ fontFamily: "Playfair Display", fontWeight: 600 }}>Billing</h3>
            <p className="text-lg opacity-90">Plans powered by Clerk Billing</p>
            <p className="mt-2 text-sm opacity-90">Free trials and checkout are configured in Clerk Dashboard.</p>
            <Button className="mt-4 bg-white text-[#0D9488] hover:bg-[#F0FDF9]" asChild>
              <Link href="/billing">Open Billing</Link>
            </Button>
          </Card>
          <BillingPlanCards plans={billingPlans} ctaHref="/billing" showFree={false} compact />
        </div>
      )}
    </div>
  );
}



