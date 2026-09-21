import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const painPoints = [
  {
    title: "Meter reading to invoice, one click",
    body: "Enter a water and electricity reading once. RentFlow calculates consumption, applies your rate, adds rent, and itemises everything on the invoice - no spreadsheet.",
  },
  {
    title: "A PromptPay QR on every bill",
    body: "Tenants scan and pay. No more typing a number into a LINE chat and hoping it is remembered correctly.",
  },
  {
    title: "Know who owes you money",
    body: "One dashboard shows outstanding balances and overdue invoices across every unit you own, not just the one building you are thinking about today.",
  },
];

const plans = [
  {
    name: "Free",
    price: "฿0",
    blurb: "For a landlord just getting off the notebook.",
    features: ["Up to 3 units", "Manual invoicing", "PromptPay QR on invoices"],
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
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex items-center justify-between py-4">
          <span className="text-lg font-bold tracking-tight">RentFlow</span>
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

      <section className="border-b bg-muted/30">
        <div className="container flex flex-col items-start gap-6 py-20">
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
            Built for landlords with 3-50 units
          </span>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Stop billing rent from a notebook and a LINE chat.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            RentFlow turns a monthly meter walk into itemised invoices with a
            PromptPay QR code, tracks who has paid, and shows you the health of
            your rental business in one dashboard.
          </p>
          <div className="flex gap-3">
            <Button asChild size="default">
              <Link href="/register">Start free with 3 units</Link>
            </Button>
            <Button asChild variant="outline">
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
            <Card key={point.title}>
              <CardHeader>
                <CardTitle className="text-lg">{point.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{point.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/30 py-16">
        <div className="container">
          <h2 className="text-2xl font-bold tracking-tight">Simple, unit-based pricing</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:max-w-2xl">
            {plans.map((plan) => (
              <Card key={plan.name}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.blurb}</CardDescription>
                  <p className="pt-2 text-3xl font-bold">{plan.price}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {plan.features.map((feature) => (
                      <li key={feature}>&bull; {feature}</li>
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

      <footer className="border-t py-8">
        <div className="container text-sm text-muted-foreground">
          RentFlow &mdash; Advanced Computer Programming Mini Project, KMITL.
        </div>
      </footer>
    </main>
  );
}
