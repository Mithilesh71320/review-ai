"use client"
import { PricingTable } from "@clerk/nextjs";
import { CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import { BillingPlanCards } from "@/components/billing-plan-cards";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { defaultTrialDays, getBillingPlans, trialOptions } from "@/lib/billing-plans";
import { cn } from "@/lib/utils";

export default function BillingPage() {
  const plans = getBillingPlans();

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[#0D9488]">Subscriptions</p>
          <h1 className="mt-2 text-[34px] text-[#1C1917]" style={{ fontFamily: "Playfair Display", fontWeight: 700 }}>
            Billing
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#78716C]">
            Pick a ReviewAI plan, start a free trial, and manage billing through Clerk.
          </p>
        </div>
        <Badge className="h-8 w-fit border-0 bg-[#FEF3C7] px-3 text-[#D97706]">
          Default trial: {defaultTrialDays} days
        </Badge>
      </div>

      <Card className="rounded-2xl border-[#E7E5E4] bg-gradient-to-br from-[#0D9488] via-[#0F766E] to-[#134E4A] p-6 text-white">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl" style={{ fontFamily: "Playfair Display", fontWeight: 700 }}>
                Start with the trial that fits your sales cycle
              </h2>
              <p className="mt-2 text-sm text-white/80">
                Clerk controls the real checkout and trial length from the Clerk Dashboard. These defaults keep the app ready for a future admin pricing editor.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {trialOptions.map((option) => (
              <div
                key={option.days}
                className={cn(
                  "rounded-xl border border-white/20 bg-white/10 p-4",
                  option.days === defaultTrialDays && "bg-white text-[#134E4A]",
                )}
              >
                <p className="font-semibold">{option.label}</p>
                <p className={cn("mt-1 text-xs", option.days === defaultTrialDays ? "text-[#78716C]" : "text-white/75")}>
                  {option.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: CreditCard, title: "Clerk checkout", text: "Subscriptions, upgrades, downgrades, and payment methods use Clerk Billing UI." },
          { icon: ShieldCheck, title: "Plan gated later", text: "Feature limits are centralized so API gating can use the same plan keys later." },
          { icon: Sparkles, title: "Trial ready", text: "7 day, 14 day, and 1 month trial defaults are documented in code now." },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="rounded-xl border-[#E7E5E4] bg-white p-5">
              <Icon className="h-5 w-5 text-[#0D9488]" />
              <h3 className="mt-3 font-semibold text-[#1C1917]">{item.title}</h3>
              <p className="mt-1 text-sm text-[#78716C]">{item.text}</p>
            </Card>
          );
        })}
      </div>

      <section className="space-y-4" id="clerk-pricing">
        <div>
          <h2 className="text-xl text-[#1C1917]" style={{ fontFamily: "Playfair Display", fontWeight: 600 }}>
            Live Clerk pricing
          </h2>
          <p className="mt-1 text-sm text-[#78716C]">
            Configure matching Free, Starter, Growth, and Pro plans in Clerk Dashboard. This table updates automatically from Clerk.
          </p>
        </div>
        <Card className="rounded-2xl border-[#E7E5E4] bg-white p-4 md:p-6">
          <PricingTable />
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl text-[#1C1917]" style={{ fontFamily: "Playfair Display", fontWeight: 600 }}>
            Default ReviewAI plans
          </h2>
          <p className="mt-1 text-sm text-[#78716C]">
            Used by the website until an admin dashboard owns pricing.
          </p>
        </div>
        <BillingPlanCards plans={plans} ctaHref="#clerk-pricing" />
      </section>
    </div>
  );
}

