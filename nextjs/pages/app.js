import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toaster";
import { apiFetch } from "@/lib/api";

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// --- Properties ------------------------------------------------------------

function PropertiesPanel({ properties, onChanged }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/properties", { method: "POST", body: { name, address } });
      setName("");
      setAddress("");
      toast({ title: "Property added" });
      onChanged();
    } catch (err) {
      toast({ title: "Could not add property", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Your properties</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.address || "-"}</TableCell>
                </TableRow>
              ))}
              {properties.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    No properties yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a property</CardTitle>
          <CardDescription>Free plan allows 1 property.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="propName">Name</Label>
              <Input id="propName" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="propAddress">Address</Label>
              <Input id="propAddress" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              Add property
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Units -------------------------------------------------------------

function UnitsPanel({ properties }) {
  const { toast } = useToast();
  const [propertyId, setPropertyId] = useState("");
  const [units, setUnits] = useState([]);
  const [form, setForm] = useState({ unit_no: "", base_rent: "", water_rate: "", elec_rate: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!propertyId && properties.length > 0) setPropertyId(String(properties[0].id));
  }, [properties, propertyId]);

  async function loadUnits(id) {
    if (!id) return;
    const data = await apiFetch(`/properties/${id}/units`);
    setUnits(data);
  }

  useEffect(() => {
    loadUnits(propertyId);
  }, [propertyId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch(`/properties/${propertyId}/units`, {
        method: "POST",
        body: {
          unit_no: form.unit_no,
          base_rent: Number(form.base_rent) || 0,
          water_rate: Number(form.water_rate) || 0,
          elec_rate: Number(form.elec_rate) || 0,
        },
      });
      setForm({ unit_no: "", base_rent: "", water_rate: "", elec_rate: "" });
      toast({ title: "Unit added" });
      loadUnits(propertyId);
    } catch (err) {
      toast({ title: "Could not add unit", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Units</CardTitle>
          <CardDescription>
            <select
              className="mt-2 h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Water rate</TableHead>
                <TableHead>Elec rate</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.unit_no}</TableCell>
                  <TableCell>{u.base_rent}</TableCell>
                  <TableCell>{u.water_rate}</TableCell>
                  <TableCell>{u.elec_rate}</TableCell>
                  <TableCell>
                    <Badge variant={u.status === "occupied" ? "success" : "secondary"}>{u.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {units.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No units in this property yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a unit</CardTitle>
          <CardDescription>Free plan allows 3 units across all properties.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label>Unit number</Label>
              <Input
                value={form.unit_no}
                onChange={(e) => setForm({ ...form, unit_no: e.target.value })}
                placeholder="A101"
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Base rent (THB/month)</Label>
              <Input
                type="number"
                min="0"
                value={form.base_rent}
                onChange={(e) => setForm({ ...form, base_rent: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Water rate</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.water_rate}
                  onChange={(e) => setForm({ ...form, water_rate: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Elec rate</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.elec_rate}
                  onChange={(e) => setForm({ ...form, elec_rate: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={submitting || !propertyId}>
              Add unit
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Tenants -------------------------------------------------------------

function TenantsPanel({ tenants, onChanged }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ full_name: "", phone: "", line_user_id: "" });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/tenants", { method: "POST", body: form });
      setForm({ full_name: "", phone: "", line_user_id: "" });
      toast({ title: "Tenant added" });
      onChanged();
    } catch (err) {
      toast({ title: "Could not add tenant", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>LINE user ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.full_name}</TableCell>
                  <TableCell>{t.phone || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{t.line_user_id || "not linked"}</TableCell>
                </TableRow>
              ))}
              {tenants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No tenants yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a tenant</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label>Full name</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>LINE user ID (optional)</Label>
              <Input
                value={form.line_user_id}
                onChange={(e) => setForm({ ...form, line_user_id: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              Add tenant
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Leases -------------------------------------------------------------

function LeasesPanel({ units, tenants, leases, onChanged }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    unit_id: "",
    tenant_id: "",
    start_date: "",
    rent_amount: "",
    deposit: "",
    billing_day: "1",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!form.unit_id && units.length > 0) setForm((f) => ({ ...f, unit_id: String(units[0].id) }));
    if (!form.tenant_id && tenants.length > 0)
      setForm((f) => ({ ...f, tenant_id: String(tenants[0].id) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units, tenants]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/leases", {
        method: "POST",
        body: {
          unit_id: Number(form.unit_id),
          tenant_id: Number(form.tenant_id),
          start_date: form.start_date,
          rent_amount: Number(form.rent_amount),
          deposit: Number(form.deposit) || 0,
          billing_day: Number(form.billing_day) || 1,
        },
      });
      toast({ title: "Lease created" });
      onChanged();
    } catch (err) {
      toast({ title: "Could not create lease", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Leases</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leases.map((l) => {
                const unit = units.find((u) => u.id === l.unit_id);
                const tenant = tenants.find((t) => t.id === l.tenant_id);
                return (
                  <TableRow key={l.id}>
                    <TableCell>{unit ? unit.unit_no : l.unit_id}</TableCell>
                    <TableCell>{tenant ? tenant.full_name : l.tenant_id}</TableCell>
                    <TableCell>{l.start_date}</TableCell>
                    <TableCell>{l.rent_amount}</TableCell>
                    <TableCell>
                      <Badge variant={l.status === "active" ? "success" : "secondary"}>{l.status}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {leases.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No leases yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create a lease</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label>Unit</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={form.unit_id}
                onChange={(e) => setForm({ ...form, unit_id: e.target.value })}
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.unit_no}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Tenant</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={form.tenant_id}
                onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Start date</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Rent</Label>
                <Input
                  type="number"
                  value={form.rent_amount}
                  onChange={(e) => setForm({ ...form, rent_amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Deposit</Label>
                <Input
                  type="number"
                  value={form.deposit}
                  onChange={(e) => setForm({ ...form, deposit: e.target.value })}
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={submitting || !form.unit_id || !form.tenant_id}
            >
              Create lease
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Meter readings -------------------------------------------------------

function MetersPanel({ units }) {
  const { toast } = useToast();
  const [unitId, setUnitId] = useState("");
  const [period, setPeriod] = useState(currentPeriod());
  const [waterCurr, setWaterCurr] = useState("");
  const [elecCurr, setElecCurr] = useState("");
  const [readings, setReadings] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!unitId && units.length > 0) setUnitId(String(units[0].id));
  }, [units, unitId]);

  async function loadReadings(id) {
    if (!id) return;
    setReadings(await apiFetch(`/units/${id}/meter-readings`));
  }

  useEffect(() => {
    loadReadings(unitId);
  }, [unitId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch(`/units/${unitId}/meter-readings`, {
        method: "POST",
        body: {
          unit_id: Number(unitId),
          period,
          water_curr: Number(waterCurr),
          elec_curr: Number(elecCurr),
        },
      });
      toast({ title: "Reading recorded" });
      setWaterCurr("");
      setElecCurr("");
      loadReadings(unitId);
    } catch (err) {
      toast({ title: "Could not record reading", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Meter readings</CardTitle>
          <CardDescription>
            <select
              className="mt-2 h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.unit_no}
                </option>
              ))}
            </select>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Water</TableHead>
                <TableHead>Electric</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {readings.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.period}</TableCell>
                  <TableCell>
                    {r.water_prev} &rarr; {r.water_curr}
                  </TableCell>
                  <TableCell>
                    {r.elec_prev} &rarr; {r.elec_curr}
                  </TableCell>
                </TableRow>
              ))}
              {readings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No readings recorded for this unit yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Record a reading</CardTitle>
          <CardDescription>A lower reading than last time is rejected.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label>Period</Label>
              <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Water meter (current)</Label>
              <Input
                type="number"
                min="0"
                value={waterCurr}
                onChange={(e) => setWaterCurr(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Electric meter (current)</Label>
              <Input
                type="number"
                min="0"
                value={elecCurr}
                onChange={(e) => setElecCurr(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting || !unitId}>
              Save reading
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Invoices -------------------------------------------------------------

function InvoicesPanel({ leases, properties, user }) {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [leaseId, setLeaseId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [period, setPeriod] = useState(currentPeriod());
  const [payAmounts, setPayAmounts] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!leaseId && leases.length > 0) setLeaseId(String(leases[0].id));
    if (!propertyId && properties.length > 0) setPropertyId(String(properties[0].id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leases, properties]);

  async function loadInvoices() {
    setInvoices(await apiFetch("/invoices"));
  }

  useEffect(() => {
    loadInvoices();
  }, []);

  async function handleGenerate(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await apiFetch("/billing/generate", { method: "POST", body: { lease_id: Number(leaseId), period } });
      toast({ title: "Invoice generated" });
      loadInvoices();
    } catch (err) {
      toast({ title: "Could not generate invoice", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function handleBulkGenerate() {
    setBusy(true);
    try {
      const created = await apiFetch("/billing/generate-bulk", {
        method: "POST",
        body: { property_id: Number(propertyId), period },
      });
      toast({ title: `Generated ${created.length} invoice(s)` });
      loadInvoices();
    } catch (err) {
      toast({ title: "Bulk run failed", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function handlePay(invoiceId) {
    const amount = Number(payAmounts[invoiceId]);
    if (!amount) return;
    try {
      await apiFetch(`/invoices/${invoiceId}/payments`, { method: "POST", body: { amount } });
      toast({ title: "Payment recorded" });
      setPayAmounts((prev) => ({ ...prev, [invoiceId]: "" }));
      loadInvoices();
    } catch (err) {
      toast({ title: "Could not record payment", description: err.message, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generate one invoice</CardTitle>
            <CardDescription>Requires a meter reading for that period first.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label>Lease</Label>
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={leaseId}
                  onChange={(e) => setLeaseId(e.target.value)}
                >
                  {leases.map((l) => (
                    <option key={l.id} value={l.id}>
                      Lease #{l.id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Period</Label>
                <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
              </div>
              <Button type="submit" disabled={busy || !leaseId}>
                Generate
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bulk generate (Pro)</CardTitle>
            <CardDescription>
              Bills every active lease in a property for the period in one click.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label>Property</Label>
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              {user.tier === "pro" || user.role === "admin" ? (
                <Button onClick={handleBulkGenerate} disabled={busy || !propertyId}>
                  Run bulk billing
                </Button>
              ) : (
                <Badge variant="warning">Upgrade to Pro to unlock bulk billing</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Lease</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Record payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>{inv.period}</TableCell>
                  <TableCell>#{inv.lease_id}</TableCell>
                  <TableCell>{inv.total}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        inv.status === "paid" ? "success" : inv.status === "partial" ? "warning" : "secondary"
                      }
                    >
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="h-8 w-24"
                        placeholder="Amount"
                        value={payAmounts[inv.id] || ""}
                        onChange={(e) => setPayAmounts((prev) => ({ ...prev, [inv.id]: e.target.value }))}
                        disabled={inv.status === "paid"}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={inv.status === "paid"}
                        onClick={() => handlePay(inv.id)}
                      >
                        Pay
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No invoices yet.
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

// --- Page -------------------------------------------------------------

export default function Workspace() {
  return (
    <AppShell>
      {({ user }) => <WorkspaceBody user={user} />}
    </AppShell>
  );
}

function WorkspaceBody({ user }) {
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [leases, setLeases] = useState([]);
  const [loaded, setLoaded] = useState(false);

  async function refreshAll() {
    const [propertyRows, tenantRows, leaseRows] = await Promise.all([
      apiFetch("/properties"),
      apiFetch("/tenants"),
      apiFetch("/leases"),
    ]);
    setProperties(propertyRows);
    setTenants(tenantRows);
    setLeases(leaseRows);

    const unitLists = await Promise.all(
      propertyRows.map((p) => apiFetch(`/properties/${p.id}/units`))
    );
    setUnits(unitLists.flat());
    setLoaded(true);
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!loaded) return <p className="text-muted-foreground">Loading your portfolio...</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workspace</h1>
          <p className="text-sm text-muted-foreground">
            {properties.length} propert{properties.length === 1 ? "y" : "ies"} &middot; {units.length} unit
            {units.length === 1 ? "" : "s"} &middot; {leases.length} lease{leases.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <Tabs defaultValue="properties">
        <TabsList>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="units">Units</TabsTrigger>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="leases">Leases</TabsTrigger>
          <TabsTrigger value="meters">Meter readings</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="properties">
          <PropertiesPanel properties={properties} onChanged={refreshAll} />
        </TabsContent>
        <TabsContent value="units">
          <UnitsPanel properties={properties} />
        </TabsContent>
        <TabsContent value="tenants">
          <TenantsPanel tenants={tenants} onChanged={refreshAll} />
        </TabsContent>
        <TabsContent value="leases">
          <LeasesPanel units={units} tenants={tenants} leases={leases} onChanged={refreshAll} />
        </TabsContent>
        <TabsContent value="meters">
          <MetersPanel units={units} />
        </TabsContent>
        <TabsContent value="invoices">
          <InvoicesPanel leases={leases} properties={properties} user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
