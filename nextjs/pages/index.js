import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const painPoints = [
  {
    title: "Meter reading to invoice, one click",
    body: "Enter a water and electricity reading once. RentFlow calculates consumption, applies your rate, adds rent, and itemises everything on the invoice - no spreadsheet.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"
      />
    ),
  },
  {
    title: "A PromptPay QR on every bill",
    body: "Tenants scan and pay. No more typing a number into a LINE chat and hoping it is remembered correctly.",
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" strokeLinejoin="round" />
        <rect x="14" y="3" width="7" height="7" rx="1" strokeLinejoin="round" />
        <rect x="3" y="14" width="7" height="7" rx="1" strokeLinejoin="round" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 14h3v3h-3zM19 14h2v2h-2zM14 19h2v2h-2zM19 19h2v2h-2z" />
      </>
    ),
  },
  {
    title: "Know who owes you money",
    body: "One dashboard shows outstanding balances and overdue invoices across every unit you own, not just the one building you are thinking about today.",
    icon: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V10M11 19V5M18 19v-7" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16" />
      </>
    ),
  },
];

const plans = [
  {
    name: "Free",
    price: "฿0",
    blurb: "For a landlord just getting off the notebook.",
    features: ["Up to 3 units", "Manual invoicing", "PromptPay QR on invoices"],
    highlight: false,
  },
  {
    name: "Pro",
    price: "฿299/mo",
    blurb: "For a landlord ready to stop doing this by hand.",
    features: [
      "Unlimited units",
      "Bulk monthly invoice run",
      "Automatic utility calculation",
      "LINE notifications to tenants",
    ],
    highlight: true,
  },
];

function IconChip({ children }) {
  return (
    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        {children}
      </svg>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-black/10 bg-background">
        <div className="container flex items-center justify-between py-4">
          <span className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
              R
            </span>
            RentFlow
          </span>
          <nav className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero - black, with an orange glow and an orange CTA */}
      <section className="relative overflow-hidden bg-[hsl(var(--brand-black))] text-white">
        <div
          className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--brand-orange)) 0%, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -left-32 bottom-0 h-[360px] w-[360px] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--brand-orange)) 0%, transparent 70%)" }}
        />
        <div className="container relative flex flex-col items-start gap-6 py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-orange-200">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Built for landlords with 3-50 units
          </span>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Stop billing rent from a notebook and a{" "}
            <span className="text-primary">LINE chat</span>.
          </h1>
          <p className="max-w-xl text-lg text-white/70">
            RentFlow turns a monthly meter walk into itemised invoices with a
            PromptPay QR code, tracks who has paid, and shows you the health of
            your rental business in one dashboard.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="default" className="shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
              <Link href="/register">Start free with 3 units</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/pricing">See pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <h2 className="text-2xl font-bold tracking-tight">
          The part of being a landlord nobody wants to do by hand
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {painPoints.map((point) => (
            <Card key={point.title} className="border-black/10 transition-shadow hover:shadow-md">
              <CardHeader>
                <IconChip>{point.icon}</IconChip>
                <CardTitle className="text-lg">{point.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{point.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-black/10 bg-secondary/60 py-16">
        <div className="container">
          <h2 className="text-2xl font-bold tracking-tight">Simple, unit-based pricing</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:max-w-2xl">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={
                  plan.highlight
                    ? "relative border-2 border-primary shadow-lg"
                    : "border-black/10"
                }
              >
                {plan.highlight && (
                  <span className="absolute -top-3 right-5 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                    Most room to grow
                  </span>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.blurb}</CardDescription>
                  <p className="pt-2 text-3xl font-bold">{plan.price}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button asChild className="mt-8">
            <Link href="/pricing">Compare plans in full</Link>
          </Button>
        </div>
      </section>

      <footer className="bg-[hsl(var(--brand-black))] py-8 text-white/60">
        <div className="container flex items-center justify-between text-sm">
          <span>RentFlow &mdash; Advanced Computer Programming Mini Project, KMITL.</span>
          <span className="text-primary">Built with FastAPI &middot; PostgreSQL &middot; Next.js</span>
        </div>
      </footer>
    </main>
  );
}
