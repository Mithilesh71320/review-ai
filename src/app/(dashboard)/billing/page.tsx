"use client";

import { PricingTable } from "@clerk/nextjs";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CreditCard, Lock, ShieldCheck } from "lucide-react";
import { BillingPlanCards } from "@/components/billing-plan-cards";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getBillingPlans } from "@/lib/billing-plans";

export default function BillingPage() {
  const plans = getBillingPlans();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/dashboard";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[#0D9488]">Subscriptions</p>
          <h1
            className="mt-2 text-[34px] text-[#1C1917]"
            style={{ fontFamily: "Playfair Display", fontWeight: 700 }}
          >
            Billing
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#78716C]">
            Paid plans only. Pick a plan and test Clerk checkout flow.
          </p>
          <Button variant="link" className="mt-2 px-0 text-[#0D9488]" asChild>
            <Link href={returnTo}>Back to previous page</Link>
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl border-[#E7E5E4] bg-gradient-to-br from-[#0D9488] via-[#0F766E] to-[#134E4A] p-6 text-white">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: CreditCard,
              title: "Paid checkout",
              text: "No free plan in app config. Users must subscribe before using paid features.",
            },
            {
              icon: Lock,
              title: "Plan limits",
              text: "Business count, review storage, and AI access now follow Starter, Growth, and Pro limits.",
            },
            {
              icon: ShieldCheck,
              title: "Clerk source of truth",
              text: "Disable free trial in Clerk Dashboard too. Checkout trial behavior comes from Clerk plan config.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-xl border border-white/15 bg-white/10 p-4"
              >
                <Icon className="h-5 w-5" />
                <h2 className="mt-3 font-semibold">{item.title}</h2>
                <p className="mt-1 text-sm text-white/80">{item.text}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <section className="space-y-4" id="clerk-pricing">
        <div>
          <h2
            className="text-xl text-[#1C1917]"
            style={{ fontFamily: "Playfair Display", fontWeight: 600 }}
          >
            Live Clerk pricing
          </h2>
          <p className="mt-1 text-sm text-[#78716C]">
            Make the same Starter, Growth, and Pro plans in Clerk Dashboard. Turn
            free trial off there for real payment-only checkout.
          </p>
        </div>
        <Card className="rounded-2xl border-[#E7E5E4] bg-white p-4 md:p-6">
          <PricingTable newSubscriptionRedirectUrl={returnTo} />
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2
            className="text-xl text-[#1C1917]"
            style={{ fontFamily: "Playfair Display", fontWeight: 600 }}
          >
            Default ReviewAI plans
          </h2>
          <p className="mt-1 text-sm text-[#78716C]">
            Local fallback plan copy used by the website UI.
          </p>
        </div>
        <BillingPlanCards plans={plans} ctaHref="#clerk-pricing" />
      </section>
    </div>
  );
}
