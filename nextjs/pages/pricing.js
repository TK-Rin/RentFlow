import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toaster";
import { apiFetch, getStoredUser, getToken, saveSession } from "@/lib/api";

export default function Pricing() {
  return <AppShell>{({ user }) => <PricingBody user={user} />}</AppShell>;
}

function PricingBody({ user }) {
  const { toast } = useToast();
  const [plans, setPlans] = useState([]);
  const [checkout, setCheckout] = useState(null); // { transaction_ref, amount, promptpay_payload }
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    apiFetch("/subscriptions/plans").then(setPlans);
  }, []);

  async function startCheckout() {
    try {
      const data = await apiFetch("/subscriptions/checkout", { method: "POST" });
      setCheckout(data);
    } catch (err) {
      toast({ title: "Could not start checkout", description: err.message, variant: "destructive" });
    }
  }

  async function confirmPayment() {
    setConfirming(true);
    try {
      const result = await apiFetch("/subscriptions/confirm", {
        method: "POST",
        body: { transaction_ref: checkout.transaction_ref },
      });
      const storedUser = getStoredUser();
      saveSession(getToken(), { ...storedUser, tier: result.tier });
      toast({ title: "You are on Pro", description: "Bulk billing and PDF export are unlocked." });
      setCheckout(null);
      window.location.reload();
    } catch (err) {
      toast({ title: "Could not confirm payment", description: err.message, variant: "destructive" });
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Plans</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Unit-based pricing: the gate binds when your portfolio grows, not before.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => (
          <Card key={plan.id} className={plan.id === "pro" ? "border-primary" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                {user.tier === plan.id && <Badge variant="success">Current plan</Badge>}
              </div>
              <CardDescription>
                <span className="text-2xl font-bold text-foreground">
                  {plan.price_per_month === 0 ? "฿0" : `฿${plan.price_per_month}`}
                </span>
                {plan.price_per_month > 0 && "/month"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {plan.features.map((f) => (
                  <li key={f}>&bull; {f}</li>
                ))}
              </ul>
              {plan.id === "pro" && user.tier !== "pro" && (
                <Button className="mt-4 w-full" onClick={startCheckout}>
                  Upgrade to Pro
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {checkout && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Scan to pay with PromptPay</CardTitle>
            <CardDescription>
              Reference {checkout.transaction_ref} &middot; ฿{checkout.amount}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="rounded-lg border p-4">
              <QRCodeSVG value={checkout.promptpay_payload} size={200} />
            </div>
            <p className="max-w-md text-center text-xs text-muted-foreground">
              This QR uses the real PromptPay payload format and will scan in a banking
              app. Confirmation below is simulated for this student project - in
              production it would arrive as a signed webhook from the payment
              provider, not a button the payer clicks themselves.
            </p>
            <Button onClick={confirmPayment} disabled={confirming}>
              {confirming ? "Confirming..." : "Simulate payment confirmation"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
