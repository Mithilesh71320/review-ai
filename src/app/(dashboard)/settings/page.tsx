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
    sentimentModel: string;
    analysisLanguage: string;
    autoRespond: boolean;
  };
  sources: Array<{
    source: string;
    key: "GOOGLE" | "YELP" | "FACEBOOK" | "TRIPADVISOR";
    connected: boolean;
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
    sentimentModel: "balanced",
    analysisLanguage: "en",
    autoRespond: true,
  },
  sources: [],
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<SettingsResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [placeSearchQuery, setPlaceSearchQuery] = useState("");

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

  const applyBusinessSelection = (business: { name: string; placeId: string }) => {
    updateState((current) => ({
      ...current,
      business: {
        ...current.business,
        name: business.name,
        placeId: business.placeId,
      },
      sources: current.sources.map((source) =>
        source.key === "GOOGLE" ? { ...source, connected: true } : source,
      ),
    }));
    setMessage(`Selected ${business.name} as the Google business.`);
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
              <CardTitle>Business Profile</CardTitle>
              <CardDescription>Update your business information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="business-name">Business Name</Label>
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
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={state.business.website}
                    onChange={(e) =>
                      updateState((current) => ({
                        ...current,
                        business: { ...current.business, website: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="placeId">Google Place ID</Label>
                  <Input
                    id="placeId"
                    value={state.business.placeId}
                    onChange={(e) =>
                      updateState((current) => ({
                        ...current,
                        business: { ...current.business, placeId: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

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
                        Select one to populate the business name and Google Place ID.
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
                            <span className="text-sm text-primary">Use this</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              <Separator />

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Search Google Places</p>
                  <p className="text-sm text-muted-foreground">
                    Fallback when Business Profile locations are unavailable.
                  </p>
                </div>
                <Input
                  placeholder="Search by business name or address"
                  value={placeSearchQuery}
                  onChange={(event) => setPlaceSearchQuery(event.target.value)}
                />
                {placeSearchError && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                    {placeSearchError}
                  </div>
                )}
                {placeSearchResultsQuery.isFetching && (
                  <div className="text-sm text-muted-foreground">Searching places...</div>
                )}
                {placeSearchResultsQuery.data && placeSearchQuery.trim().length >= 3 && (
                  <div className="space-y-2">
                    {placeSearchResultsQuery.data.places.map((place) => (
                      <button
                        key={place.placeId}
                        type="button"
                        className="w-full rounded-lg border border-border bg-background px-4 py-3 text-left transition hover:border-primary/40 hover:bg-accent/30"
                        onClick={() =>
                          applyBusinessSelection({
                            name: place.name,
                            placeId: place.placeId,
                          })
                        }
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
                    {placeSearchResultsQuery.data.places.length === 0 && (
                      <p className="text-sm text-muted-foreground">No places found.</p>
                    )}
                  </div>
                )}
              </div>
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
                  <p className="text-sm font-medium text-foreground">Auto-respond to reviews</p>
                  <p className="text-sm text-muted-foreground">
                    AI will draft response suggestions automatically
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
