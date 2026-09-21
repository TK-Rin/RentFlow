import { useEffect, useState } from "react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api";

export default function Account() {
  return <AppShell>{({ user }) => <AccountBody user={user} />}</AppShell>;
}

function AccountBody({ user }) {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    apiFetch("/subscriptions/transactions").then(setTransactions);
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Name: </span>
            {user.full_name}
          </p>
          <p>
            <span className="text-muted-foreground">Email: </span>
            {user.email}
          </p>
          <p>
            <span className="text-muted-foreground">Role: </span>
            {user.role}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Subscription</CardTitle>
            <Badge variant={user.tier === "pro" ? "success" : "secondary"}>
              {user.tier === "pro" ? "Pro" : "Free"}
            </Badge>
          </div>
          <CardDescription>
            {user.tier === "pro"
              ? "Unlimited units, bulk billing, and LINE notifications are unlocked."
              : "Up to 3 units and manual invoicing. Upgrade for unlimited units and bulk billing."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user.tier !== "pro" && (
            <Button asChild>
              <Link href="/pricing">Upgrade to Pro</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing history</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.promptpay_ref}</TableCell>
                  <TableCell className="capitalize">{t.plan}</TableCell>
                  <TableCell>{t.amount}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === "paid" ? "success" : "secondary"}>{t.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No billing history yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
