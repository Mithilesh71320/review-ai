import Link from "next/link";
import { CheckCircle, Menu, Scissors, Star } from "lucide-react";
import { BillingPlanCards } from "@/components/billing-plan-cards";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getBillingPlans } from "@/lib/billing-plans";

const problems = [
  {
    title: "Scattered reviews everywhere",
    description:
      "Google, Yelp, Facebook - reviews are spread across platforms and you are missing critical feedback",
  },
  {
    title: "No time to respond",
    description:
      "Between appointments, you cannot craft thoughtful responses to every review",
  },
  {
    title: "Cannot spot patterns",
    description:
      "You know something is wrong but cannot pinpoint what is consistently bothering clients",
  },
];

export default function Home() {
  const plans = getBillingPlans();

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 border-b border-[#E7E5E4] bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-8">
          <div className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-[#0D9488]" />
            <div className="font-bold text-[#0D9488]">ReviewAI</div>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-[#78716C] hover:text-[#0D9488]">Features</a>
            <a href="#pricing" className="text-sm text-[#78716C] hover:text-[#0D9488]">Pricing</a>
            <a href="#about" className="text-sm text-[#78716C] hover:text-[#0D9488]">About</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="hidden md:inline-flex" asChild>
              <Link href="/dashboard">Sign In</Link>
            </Button>
            <Button className="bg-[#0D9488] text-white hover:bg-[#134E4A]" asChild>
              <Link href="/sign-up">Get Started</Link>
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>

      <section className="px-8 py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-widest text-[#0D9488]">Built for Salons & Spas</p>
            <h1 className="text-[52px] leading-tight text-[#1C1917]" style={{ fontFamily: "Playfair Display", fontWeight: 700 }}>
              Know exactly what your clients are saying <span className="text-[#0D9488]">before it hurts your business</span>
            </h1>
            <p className="text-base text-[#78716C]">
              ReviewAI aggregates reviews from all platforms, analyzes sentiment with AI, and helps you respond faster while spotting patterns that matter.
            </p>
            <div className="flex gap-4">
              <Button className="bg-[#0D9488] text-white hover:bg-[#134E4A]" size="lg" asChild>
                <Link href="/sign-up">Get Started</Link>
              </Button>
              <Button variant="outline" size="lg">See how it works</Button>
            </div>
            <div className="flex items-center gap-3 pt-4">
              <div className="flex -space-x-2">
                {["A", "B", "C"].map((letter) => (
                  <div key={letter} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#0D9488] text-xs text-white">
                    {letter}
                  </div>
                ))}
              </div>
              <p className="text-sm text-[#78716C]">Join 200+ salons already monitoring their reputation</p>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-xl border border-[#E7E5E4] bg-[#F8F6F1] p-6 shadow-2xl">
              <div className="space-y-4 rounded-lg bg-white p-4">
                <div className="flex items-center gap-2 border-b border-[#E7E5E4] pb-2">
                  <div className="h-2 w-2 rounded-full bg-[#EF4444]" />
                  <div className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                  <div className="h-2 w-2 rounded-full bg-[#10B981]" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-[#0D9488]" />
                    <div className="flex-1">
                      <div className="h-2 w-3/4 rounded bg-[#E7E5E4]" />
                      <div className="mt-1 h-2 w-1/2 rounded bg-[#E7E5E4]" />
                    </div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="h-3 w-3 text-[#D97706]" fill="#D97706" />)}
                    </div>
                  </div>
                  <div className="h-12 rounded bg-[#F8F6F1] p-2">
                    <div className="h-2 w-full rounded bg-[#E7E5E4]" />
                    <div className="mt-1 h-2 w-4/5 rounded bg-[#E7E5E4]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#EDE8E0] px-8 py-20">
        <div className="mx-auto max-w-6xl space-y-12 text-center">
          <h2 className="text-4xl text-[#1C1917]" style={{ fontFamily: "Playfair Display", fontWeight: 600 }}>Running a salon is hard enough</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {problems.map((problem) => (
              <Card key={problem.title} className="rounded-xl border-[#E7E5E4] bg-white p-6 text-left">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#FEE2E2]">
                  <div className="h-6 w-6 rounded-full bg-[#EF4444]" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{problem.title}</h3>
                <p className="text-sm text-[#78716C]">{problem.description}</p>
              </Card>
            ))}
          </div>
          <p className="text-xl text-[#0D9488]" style={{ fontFamily: "Playfair Display", fontWeight: 600 }}>ReviewAI fixes all of this.</p>
        </div>
      </section>

      <section id="features" className="px-8 py-20">
        <div className="mx-auto max-w-6xl space-y-20">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-3xl text-[#1C1917]" style={{ fontFamily: "Playfair Display", fontWeight: 600 }}>All reviews in one place</h3>
              <p className="text-base text-[#78716C]">We automatically pull reviews from Google, Yelp, Facebook, and Tripadvisor so you never miss feedback again.</p>
              {[
                "Real-time sync",
                "Unified dashboard",
                "Never miss a review",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-[#10B981]" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
            <div className="flex h-64 items-center justify-center rounded-xl bg-[#F8F6F1] p-8 text-[#78716C]">Feature Mockup</div>
          </div>
        </div>
      </section>

      <section id="pricing" className="px-8 py-20">
        <div className="mx-auto max-w-6xl space-y-12">
          <div className="text-center">
            <h2 className="text-3xl text-[#1C1917]" style={{ fontFamily: "Playfair Display", fontWeight: 600 }}>Simple, transparent pricing</h2>
          </div>
          <BillingPlanCards plans={plans} ctaHref="/sign-up" compact />
        </div>
      </section>

      <footer className="border-t border-[#E7E5E4] px-8 py-12">
        <div className="mx-auto max-w-6xl text-center text-sm text-[#78716C]">© 2026 ReviewAI. All rights reserved.</div>
      </footer>
    </div>
  );
}




