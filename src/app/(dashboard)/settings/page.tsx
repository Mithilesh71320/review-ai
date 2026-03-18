"use client";

import { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchJson } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { X } from "lucide-react";

type SettingsResponse = {
  business: {
    name: string;
    email: string;
    phone: string;
    website: string;
    placeId: string;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    weeklyDigest: boolean;
  };
  ai: {
    provider: string;
    sentimentModel: string;
    analysisLanguage: string;
    autoRespond: boolean;
  };
  sources: Array<{
    source: string;
    key: "GOOGLE" | "YELP" | "FACEBOOK" | "TRIPADVISOR";
    connected: boolean;
  }>;
  businesses: Array<{
    id?: string;
    name: string;
    placeId: string;
    accountName?: string | null;
    locationName?: string | null;
    mapsUri?: string | null;
  }>;
};

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

type GoogleOAuthStartResponse = {
  authUrl: string;
};

const initialState: SettingsResponse = {
  business: {
    name: "",
    email: "",
    phone: "",
    website: "",
    placeId: "",
  },
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    weeklyDigest: true,
  },
  ai: {
    provider: "gemini",
    sentimentModel: "balanced",
    analysisLanguage: "en",
    autoRespond: true,
  },
  sources: [],
  businesses: [],
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
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
    queryFn: () =>
      fetchJson<GoogleBusinessesResponse>("/api/google/businesses", { cache: "no-store" }),
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
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "Failed to save settings.");
    },
  });

  const connectGoogleMutation = useMutation({
    mutationFn: () =>
      fetchJson<GoogleOAuthStartResponse>("/api/google/oauth/start", {
        cache: "no-store",
      }),
    onSuccess: ({ authUrl }) => {
      window.location.assign(authUrl);
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "Failed to start Google OAuth.");
    },
  });

  const applyBusinessSelection = (business: {
    name: string;
    placeId: string;
    accountName?: string | null;
    locationName?: string | null;
    mapsUri?: string | null;
  }) => {
    updateState((current) => ({
      ...current,
      businesses: current.businesses.some((item) => item.placeId === business.placeId)
        ? current.businesses.map((item) =>
            item.placeId === business.placeId ? { ...item, ...business } : item,
          )
        : [...current.businesses, business],
      sources: current.sources.map((source) =>
        source.key === "GOOGLE" ? { ...source, connected: true } : source,
      ),
    }));
    setSelectionDirty(true);
    setMessage(`${business.name} added to monitored businesses.`);
  };

  const removeBusiness = (placeId: string) => {
    updateState((current) => ({
      ...current,
      businesses: current.businesses.filter((business) => business.placeId !== placeId),
    }));
    setSelectionDirty(true);
    setMessage("Business removed from monitored businesses.");
  };

  const isLoading = settingsQuery.isPending;
  const settingsError =
    settingsQuery.error instanceof Error ? settingsQuery.error.message : null;
  const businessesError =
    googleBusinessesQuery.error instanceof Error
      ? googleBusinessesQuery.error.message
      : null;
  const placeSearchError =
    placeSearchResultsQuery.error instanceof Error
      ? placeSearchResultsQuery.error.message
      : null;
  const placeSuggestions = placeSearchResultsQuery.data?.places ?? [];

  const selectPlaceSuggestion = (place: GooglePlaceSearchResponse["places"][number]) => {
    setNewBusiness({
      name: place.name,
      placeId: place.placeId,
    });
    setPlaceSearchQuery("");
    setMessage("Place selected. Click + Add Business to save it.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account, Google business connection, and application preferences.
        </p>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Loading settings...</div>}
      {settingsError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {settingsError}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-foreground">
          {message}
        </div>
      )}

      {!isLoading && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>User Profile</CardTitle>
              <CardDescription>
                Update the account details for the signed-in user.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="business-name">Username</Label>
                  <Input
                    id="business-name"
                    value={state.business.name}
                    onChange={(e) =>
                      updateState((current) => ({
                        ...current,
                        business: { ...current.business, name: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={state.business.email}
                    onChange={(e) =>
                      updateState((current) => ({
                        ...current,
                        business: { ...current.business, email: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={state.business.phone}
                    onChange={(e) =>
                      updateState((current) => ({
                        ...current,
                        business: { ...current.business, phone: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business Profiles</CardTitle>
              <CardDescription>
                Add and manage multiple businesses for this account using Google search
                or manual place IDs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                <p className="text-sm font-medium text-foreground">How this works</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Search Google Places, click a result to add it, or enter the business
                  name and place ID manually. You can keep adding multiple businesses for
                  the same user.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3 md:items-start">
                <div className="space-y-2">
                  <Label htmlFor="new-business-name">Business Name</Label>
                  <Input
                    id="new-business-name"
                    value={newBusiness.name}
                    onChange={(event) =>
                      setNewBusiness((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                  <Button
                    className="w-full md:w-auto"
                    onClick={() => {
                      if (!newBusiness.name.trim() || !newBusiness.placeId.trim()) {
                        setMessage("Business name and place ID are required to add a business.");
                        return;
                      }

                      applyBusinessSelection({
                        name: newBusiness.name.trim(),
                        placeId: newBusiness.placeId.trim(),
                      });
                      setNewBusiness({ name: "", placeId: "" });
                    }}
                  >
                    + Add Business
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="place-search">Search Google Places</Label>
                  <div className="relative">
                    <Input
                      id="place-search"
                      placeholder="Search by business name or address"
                      value={placeSearchQuery}
                      onChange={(event) => setPlaceSearchQuery(event.target.value)}
                      autoComplete="off"
                    />
                    {placeSearchQuery.trim().length >= 3 && (
                      <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-border bg-popover shadow-lg">
                        {placeSearchResultsQuery.isFetching && (
                          <div className="px-4 py-3 text-sm text-muted-foreground">
                            Searching places...
                          </div>
                        )}
                        {!placeSearchResultsQuery.isFetching && placeSearchError && (
                          <div className="px-4 py-3 text-sm text-destructive">
                            {placeSearchError}
                          </div>
                        )}
                        {!placeSearchResultsQuery.isFetching &&
                          !placeSearchError &&
                          placeSuggestions.map((place) => (
                            <button
                              key={place.placeId}
                              type="button"
                              className="block w-full border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-accent/40"
                              onClick={() => selectPlaceSuggestion(place)}
                            >
                              <p className="font-medium text-foreground">{place.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {place.address ?? "No address available"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Place ID: {place.placeId}
                              </p>
                            </button>
                          ))}
                        {!placeSearchResultsQuery.isFetching &&
                          !placeSearchError &&
                          placeSuggestions.length === 0 && (
                            <div className="px-4 py-3 text-sm text-muted-foreground">
                              No places found.
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-business-place-id">Google Place ID</Label>
                  <Input
                    id="new-business-place-id"
                    value={newBusiness.placeId}
                    onChange={(event) =>
                      setNewBusiness((current) => ({ ...current, placeId: event.target.value }))
                    }
                  />
                </div>
              </div>

              {state.businesses.length > 0 ? (
                <div className="space-y-2">
                  {state.businesses.map((business) => (
                    <div
                      key={business.id ?? business.placeId}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-foreground">{business.name}</p>
                        <p className="text-xs text-muted-foreground">{business.placeId}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${business.name}`}
                        onClick={() => removeBusiness(business.placeId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No monitored businesses added yet.
                </p>
              )}

              <Separator />

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  disabled={connectGoogleMutation.isPending}
                  onClick={() => {
                    setMessage(null);
                    void connectGoogleMutation.mutateAsync();
                  }}
                >
                  {connectGoogleMutation.isPending
                    ? "Connecting..."
                    : "Connect Google Account"}
                </Button>
                <Button
                  variant="secondary"
                  disabled={googleBusinessesQuery.isFetching}
                  onClick={() => void googleBusinessesQuery.refetch()}
                >
                  {googleBusinessesQuery.isFetching
                    ? "Refreshing..."
                    : "Refresh Google Businesses"}
                </Button>
                <Button
                  disabled={!selectionDirty || saveMutation.isPending}
                  onClick={() => {
                    setMessage(null);
                    void saveMutation.mutateAsync();
                  }}
                >
                  {saveMutation.isPending ? "Saving..." : "Save Business List"}
                </Button>
              </div>

              {businessesError && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  {businessesError}
                </div>
              )}

              {googleBusinessesQuery.data?.connected === false && (
                <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
                  Google Business account is not connected yet. Use OAuth to load your
                  business locations automatically.
                </div>
              )}

              {googleBusinessesQuery.data?.businesses &&
                googleBusinessesQuery.data.businesses.length > 0 && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Businesses from your Google account
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Click any business to add it to this user&apos;s monitored list.
                      </p>
                    </div>
                    <div className="space-y-2">
                      {googleBusinessesQuery.data.businesses.map((business) => (
                        <button
                          key={business.locationName}
                          type="button"
                          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-left transition hover:border-primary/40 hover:bg-accent/30"
                          onClick={() => {
                            if (!business.placeId) {
                              setMessage(
                                `${business.title} does not expose a Google Place ID.`,
                              );
                              return;
                            }

                            applyBusinessSelection({
                              name: business.title,
                              placeId: business.placeId,
                              accountName: business.accountName,
                              locationName: business.locationName,
                              mapsUri: business.mapsUri,
                            });
                          }}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="font-medium text-foreground">{business.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {business.address ?? business.accountName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {business.placeId ?? "No place ID available"}
                              </p>
                            </div>
                            <span className="text-sm text-primary">Add business</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Review Sources</CardTitle>
              <CardDescription>Connect and manage your review platforms.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {state.sources.map((source) => (
                <div
                  key={source.key}
                  className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">{source.source}</p>
                    <p className="text-sm text-muted-foreground">
                      {source.connected ? "Connected and syncing" : "Not connected"}
                    </p>
                  </div>
                  <Switch
                    checked={source.connected}
                    onCheckedChange={(checked) =>
                      updateState((current) => ({
                        ...current,
                        sources: current.sources.map((item) =>
                          item.key === source.key
                            ? { ...item, connected: checked }
                            : item,
                        ),
                      }))
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Configure how you receive notifications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  key: "emailNotifications",
                  label: "Email notifications",
                  description: "Receive alerts via email",
                },
                {
                  key: "pushNotifications",
                  label: "Push notifications",
                  description: "Browser push notifications",
                },
                {
                  key: "smsNotifications",
                  label: "SMS notifications",
                  description: "Text message alerts",
                },
                {
                  key: "weeklyDigest",
                  label: "Weekly digest",
                  description: "Summary email every Monday",
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch
                    checked={
                      state.notifications[
                        item.key as keyof SettingsResponse["notifications"]
                      ]
                    }
                    onCheckedChange={(checked) =>
                      updateState((current) => ({
                        ...current,
                        notifications: {
                          ...current.notifications,
                          [item.key]: checked,
                        },
                      }))
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Configuration</CardTitle>
              <CardDescription>Customize AI analysis behavior.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>AI Provider</Label>
                <Select
                  value={state.ai.provider}
                  onValueChange={(value) =>
                    updateState((current) => ({
                      ...current,
                      ai: { ...current.ai, provider: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Gemini</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sentiment Analysis Model</Label>
                <Select
                  value={state.ai.sentimentModel}
                  onValueChange={(value) =>
                    updateState((current) => ({
                      ...current,
                      ai: { ...current.ai, sentimentModel: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="aggressive">Aggressive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Analysis Language</Label>
                <Select
                  value={state.ai.analysisLanguage}
                  onValueChange={(value) =>
                    updateState((current) => ({
                      ...current,
                      ai: { ...current.ai, analysisLanguage: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">Auto-draft review replies</p>
                  <p className="text-sm text-muted-foreground">
                    AI will prepare reply suggestions that you can review and post.
                  </p>
                </div>
                <Switch
                  checked={state.ai.autoRespond}
                  onCheckedChange={(checked) =>
                    updateState((current) => ({
                      ...current,
                      ai: { ...current.ai, autoRespond: checked },
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                setMessage(null);
                void saveMutation.mutateAsync();
              }}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save All Settings"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
