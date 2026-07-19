"use client";

import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { SettingsResponse } from "@/shared/types/settings";

type AITabProps = {
  state: SettingsResponse;
  updateState: (updater: (current: SettingsResponse) => SettingsResponse) => void;
  saveMutation: { mutateAsync: () => Promise<void>; isPending: boolean };
};

export function AITab({ state, updateState, saveMutation }: AITabProps) {
  return (
    <div className="space-y-6">
      <Card className="rounded-xl border-[#E7E5E4] bg-white p-6">
        <div className="space-y-6">
          <div>
            <h3 className="mb-4 text-base font-semibold">AI Provider</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {["gemini", "openai"].map((provider) => (
                <button
                  key={provider}
                  className={cn(
                    "rounded-lg border-2 p-4 text-left transition-colors",
                    state.ai.provider === provider
                      ? "border-[#0D9488] bg-[#F0FDF9]"
                      : "border-[#E7E5E4] bg-white hover:border-[#0D9488]"
                  )}
                  onClick={() => updateState((current) => ({ ...current, ai: { ...current.ai, provider } }))}
                >
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
                <Button
                  key={mode}
                  variant={state.ai.sentimentModel === mode ? "default" : "outline"}
                  className={state.ai.sentimentModel === mode ? "bg-[#0D9488] text-white" : ""}
                  onClick={() => updateState((current) => ({ ...current, ai: { ...current.ai, sentimentModel: mode } }))}
                >
                  {mode[0].toUpperCase() + mode.slice(1)}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="language" className="mb-3 block text-sm">Response Language</Label>
            <Select
              value={state.ai.analysisLanguage}
              onValueChange={(value) => updateState((current) => ({ ...current, ai: { ...current.ai, analysisLanguage: value } }))}
            >
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
            <Switch
              checked={state.ai.autoRespond}
              onCheckedChange={(checked) => updateState((current) => ({ ...current, ai: { ...current.ai, autoRespond: checked } }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="business-context" className="text-sm">Business Context</Label>
            <textarea
              id="business-context"
              value={state.ai.businessContext}
              onChange={(event) =>
                updateState((current) => ({
                  ...current,
                  ai: { ...current.ai, businessContext: event.target.value },
                }))
              }
              disabled={!state.subscription.capabilities.businessContext}
              rows={6}
              className="min-h-32 w-full rounded-lg border border-[#E7E5E4] bg-white px-3 py-2 text-sm text-[#1C1917] outline-none focus:border-[#0D9488] disabled:cursor-not-allowed disabled:bg-[#F8F6F1] disabled:text-[#A8A29E]"
              placeholder="For Pro: explain your services, customers, brand voice, constraints, promises you can make, and things AI must never assume."
            />
            <p className="text-xs text-[#78716C]">
              {state.subscription.capabilities.businessContext
                ? "Used only for Pro to keep AI summaries and replies specific to this business."
                : "Pro plan required for business-specific AI context."}
            </p>
          </div>
        </div>
      </Card>
      <div className="flex justify-end">
        <Button className="bg-[#0D9488] text-white hover:bg-[#134E4A]" onClick={() => void saveMutation.mutateAsync()} disabled={saveMutation.isPending}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}