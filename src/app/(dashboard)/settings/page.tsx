"use client";

import { useEffect, useState } from "react";
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
  const [state, setState] = useState<SettingsResponse>(initialState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to load settings");
      }
      const payload = (await res.json()) as SettingsResponse;
      setState(payload);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to load settings";
      setError(text);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      if (!res.ok) {
        throw new Error("Failed to save settings");
      }
      setMessage("Settings saved.");
      await load();
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to save settings";
      setError(text);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application preferences.
        </p>
      </div>

      {loading && <div className="text-sm text-muted-foreground">Loading settings...</div>}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-success/40 bg-success/10 p-4 text-sm text-success">
          {message}
        </div>
      )}

      {!loading && (
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
                      setState((prev) => ({
                        ...prev,
                        business: { ...prev.business, name: e.target.value },
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
                      setState((prev) => ({
                        ...prev,
                        business: { ...prev.business, email: e.target.value },
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
                      setState((prev) => ({
                        ...prev,
                        business: { ...prev.business, phone: e.target.value },
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
                      setState((prev) => ({
                        ...prev,
                        business: { ...prev.business, website: e.target.value },
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
                      setState((prev) => ({
                        ...prev,
                        business: { ...prev.business, placeId: e.target.value },
                      }))
                    }
                  />
                </div>
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
                      setState((prev) => ({
                        ...prev,
                        sources: prev.sources.map((item) =>
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
                      setState((prev) => ({
                        ...prev,
                        notifications: {
                          ...prev.notifications,
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
                    setState((prev) => ({
                      ...prev,
                      ai: { ...prev.ai, sentimentModel: value },
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
                    setState((prev) => ({
                      ...prev,
                      ai: { ...prev.ai, analysisLanguage: value },
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
                    setState((prev) => ({
                      ...prev,
                      ai: { ...prev.ai, autoRespond: checked },
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Saving..." : "Save All Settings"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
