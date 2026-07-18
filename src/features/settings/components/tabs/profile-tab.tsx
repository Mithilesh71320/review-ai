"use client";

import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/display";
import type { SettingsResponse } from "@/shared/types/settings";

type ProfileTabProps = {
  state: SettingsResponse;
  updateState: (updater: (current: SettingsResponse) => SettingsResponse) => void;
  saveMutation: { mutateAsync: () => Promise<void>; isPending: boolean };
};

export function ProfileTab({ state, updateState, saveMutation }: ProfileTabProps) {
  return (
    <div className="space-y-6">
      <Card className="rounded-xl border-[#E7E5E4] bg-white p-6">
        <div className="space-y-6">
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="relative h-20 w-20 shrink-0">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#0D9488] text-2xl text-white">
                {getInitials(state.business.name)}
              </div>
              <button className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#0D9488] hover:bg-[#134E4A]">
                <Camera className="h-3 w-3 text-white" />
              </button>
            </div>
            <div className="grid flex-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullname" className="text-sm">Full Name</Label>
                <Input
                  id="fullname"
                  value={state.business.name}
                  onChange={(event) =>
                    updateState((current) => ({ ...current, business: { ...current.business, name: event.target.value } }))
                  }
                  className="rounded-lg border-[#E7E5E4]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm">Phone</Label>
                <Input
                  id="phone"
                  value={state.business.phone}
                  onChange={(event) =>
                    updateState((current) => ({ ...current, business: { ...current.business, phone: event.target.value } }))
                  }
                  className="rounded-lg border-[#E7E5E4]"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm">Email</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                value={state.business.email}
                onChange={(event) =>
                  updateState((current) => ({ ...current, business: { ...current.business, email: event.target.value } }))
                }
                className="flex-1 rounded-lg border-[#E7E5E4]"
              />
              <Badge variant="secondary" className="flex h-10 items-center border-0 bg-[#F8F6F1] px-3 text-[#78716C]">
                User Profile
              </Badge>
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
  );
}