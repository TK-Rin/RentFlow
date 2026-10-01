import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api";

function StatTile({ label, value }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function Admin() {
  return <AppShell requireRole="admin">{() => <AdminBody />}</AppShell>;
}

function AdminBody() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    apiFetch("/admin/stats").then(setStats);
  }, []);

  if (!stats) return <p className="text-muted-foreground">Loading business analytics...</p>;

  const tierData = stats.users_by_tier.map((row) => ({ tier: row.tier, count: row.count }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Business analytics</h1>
        <p className="text-sm text-muted-foreground">Admin-only view of RentFlow&apos;s own business.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="MRR" value={`฿${stats.mrr.toLocaleString()}`} />
        <StatTile label="Projected ARR" value={`฿${stats.arr.toLocaleString()}`} />
        <StatTile label="Total users" value={stats.total_users} />
        <StatTile label="Free → Pro conversion" value={`${stats.conversion_rate}%`} />
        <StatTile label="Active users (30d)" value={stats.active_users_30d} />
        <StatTile label="Occupancy rate" value={`${stats.occupancy_rate}%`} />
        <StatTile
          label="Total rent volume processed"
          value={`฿${stats.total_rent_volume.toLocaleString()}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">MRR trend</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.mrr_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="hsl(20 91% 48%)" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
            {stats.mrr_trend.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">No paid subscriptions yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Users by tier</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tierData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tier" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(24 10% 10%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent subscription transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recent_transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.user_email}</TableCell>
                  <TableCell>{t.amount}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === "paid" ? "success" : "secondary"}>{t.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {stats.recent_transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No transactions yet.
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
