"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { SettingsResponse } from "@/shared/types/settings";

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

type BusinessTabProps = {
  state: SettingsResponse;
  updateState: (updater: (current: SettingsResponse) => SettingsResponse) => void;
  hasPaidPlan: boolean;
  isGoogleConnected: boolean;
  googleBusinesses: GoogleBusinessesResponse["businesses"];
  placeSuggestions: GooglePlaceSearchResponse["places"];
  placeSearchQuery: string;
  setPlaceSearchQuery: (query: string) => void;
  newBusiness: { name: string; placeId: string };
  setNewBusiness: (value: { name: string; placeId: string } | ((prev: { name: string; placeId: string }) => { name: string; placeId: string })) => void;
  applyBusinessSelection: (business: SettingsResponse["businesses"][number]) => void;
  removeBusiness: (placeId: string) => void;
  connectGoogleMutation: { mutateAsync: () => Promise<void>; isPending: boolean };
  billingHref: string;
  maxBusinesses: number | null;
  saveStatus: "idle" | "saving" | "saved" | "retry";
  selectionDirty: boolean;
};

export function BusinessTab({
  state,
  updateState,
  hasPaidPlan,
  isGoogleConnected,
  googleBusinesses,
  placeSuggestions,
  placeSearchQuery,
  setPlaceSearchQuery,
  newBusiness,
  setNewBusiness,
  applyBusinessSelection,
  removeBusiness,
  connectGoogleMutation,
  billingHref,
  maxBusinesses,
  saveStatus,
  selectionDirty,
}: BusinessTabProps) {
  const handleAddBusiness = () => {
    if (!newBusiness.name.trim() || !newBusiness.placeId.trim()) {
      alert("Business name and place ID are required.");
      return;
    }
    applyBusinessSelection({ name: newBusiness.name.trim(), placeId: newBusiness.placeId.trim() });
    setNewBusiness({ name: "", placeId: "" });
  };

  return (
    <div className="space-y-6">
      {!hasPaidPlan && (
        <Card className="rounded-xl border-[#D97706]/30 bg-[#FEF3C7]/30 p-5">
          <h3 className="text-base font-semibold text-[#1C1917]">Subscription required</h3>
          <p className="mt-1 text-sm text-[#78716C]">
            Buy Starter, Growth, or Pro before adding businesses and syncing reviews.
          </p>
          <Button className="mt-4 bg-[#0D9488] text-white hover:bg-[#134E4A]" asChild>
            <Link href={billingHref}>Open Billing</Link>
          </Button>
        </Card>
      )}

      {hasPaidPlan && (
        <Card className="rounded-xl border-[#E7E5E4] bg-[#F8F6F1] p-5">
          <p className="text-sm font-semibold text-[#1C1917]">{state.subscription.planName} plan</p>
          <p className="mt-1 text-sm text-[#78716C]">
            Businesses used: {state.subscription.usage.businesses}
            {maxBusinesses === null ? " / Unlimited" : ` / ${maxBusinesses}`}
          </p>
          <p className="mt-1 text-sm text-[#78716C]">
            Stored reviews: {state.subscription.usage.storedReviews}
            {state.subscription.limits.maxStoredReviews === null
              ? " / Unlimited"
              : ` / ${state.subscription.limits.maxStoredReviews}`}
          </p>
        </Card>
      )}

      {state.businesses.map((business) => (
        <Card key={business.id ?? business.placeId} className="rounded-xl border-[#E7E5E4] bg-white p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h3 className="text-base font-semibold">{business.name}</h3>
              <p className="font-mono text-xs text-[#78716C]">Place ID: {business.placeId}</p>
              <Badge className="border-0 bg-[#10B981] text-white">Google Connected</Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-[#EF4444]"
              onClick={() => removeBusiness(business.placeId)}
              disabled={!hasPaidPlan}
            >
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
            <Input
              id="business-name"
              placeholder="Enter name"
              value={newBusiness.name}
              onChange={(event) => setNewBusiness((current) => ({ ...current, name: event.target.value }))}
              className="rounded-lg border-[#E7E5E4]"
              disabled={!hasPaidPlan}
            />
          </div>
          <div className="relative space-y-2">
            <Label htmlFor="google-search" className="text-sm">Search Google Places</Label>
            <Input
              id="google-search"
              placeholder="Search..."
              value={placeSearchQuery}
              onChange={(event) => setPlaceSearchQuery(event.target.value)}
              className="rounded-lg border-[#E7E5E4]"
              disabled={!hasPaidPlan}
            />
            {hasPaidPlan && placeSearchQuery.trim().length >= 3 && (
              <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-[#E7E5E4] bg-white shadow-lg">
                {placeSuggestions.map((place) => (
                  <button
                    key={place.placeId}
                    type="button"
                    className="block w-full border-b border-[#E7E5E4] px-4 py-3 text-left last:border-0 hover:bg-[#F0FDF9]"
                    onClick={() => {
                      setNewBusiness({ name: place.name, placeId: place.placeId });
                      setPlaceSearchQuery("");
                    }}
                  >
                    <p className="text-sm font-semibold text-[#1C1917]">{place.name}</p>
                    <p className="text-xs text-[#78716C]">{place.address ?? "No address available"}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="place-id" className="text-sm">Place ID</Label>
            <Input
              id="place-id"
              placeholder="Auto-filled"
              value={newBusiness.placeId}
              onChange={(event) => setNewBusiness((current) => ({ ...current, placeId: event.target.value }))}
              className="rounded-lg border-[#E7E5E4]"
              disabled={!hasPaidPlan}
            />
          </div>
        </div>
        <Button className="mt-4 bg-[#0D9488] text-white hover:bg-[#134E4A]" disabled={!hasPaidPlan} onClick={handleAddBusiness}>
          <Plus className="mr-2 h-4 w-4" /> Add Business
        </Button>
      </Card>

      {!isGoogleConnected && (
        <Card className="rounded-xl border-[#0D9488] bg-[#F0FDF9] p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white font-bold text-[#4285F4]">G</div>
            <div className="flex-1">
              <h3 className="text-base font-semibold">Connect Google Account</h3>
              <p className="text-sm text-[#78716C]">Link your Google Business Profile to sync reviews automatically</p>
            </div>
            <Button
              className="bg-[#0D9488] text-white hover:bg-[#134E4A]"
              disabled={connectGoogleMutation.isPending || !hasPaidPlan}
              onClick={() => void connectGoogleMutation.mutateAsync()}
            >
              {connectGoogleMutation.isPending ? "Connecting..." : "Connect"}
            </Button>
          </div>
        </Card>
      )}

      {googleBusinesses.length ? (
        <div className="space-y-3">
          {googleBusinesses.map((business) => (
            <button
              key={business.locationName}
              className="w-full rounded-xl border border-[#E7E5E4] bg-white p-4 text-left hover:bg-[#F0FDF9]"
              onClick={() =>
                business.placeId &&
                applyBusinessSelection({
                  name: business.title,
                  placeId: business.placeId,
                  accountName: business.accountName,
                  locationName: business.locationName,
                  mapsUri: business.mapsUri,
                })
              }
            >
              <p className="font-semibold text-[#1C1917]">{business.title}</p>
              <p className="text-sm text-[#78716C]">{business.address ?? business.accountName}</p>
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => window.location.reload()} disabled={!hasPaidPlan}>
          Refresh Google Businesses
        </Button>
        {saveStatus === "saving" && <p className="self-center text-xs text-[#78716C]">Saving...</p>}
        {saveStatus === "saved" && <p className="self-center text-xs text-[#10B981]">✓ Saved</p>}
        {saveStatus === "retry" && <p className="self-center text-xs text-[#EF4444]">Save failed — retrying...</p>}
        {saveStatus === "idle" && selectionDirty && (
          <p className="self-center text-xs text-[#78716C]">Unsaved changes. Auto-saves when you leave.</p>
        )}
      </div>
    </div>
  );
}