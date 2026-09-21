import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { clearSession, getStoredUser, getToken } from "@/lib/api";

// Wraps every page behind login: redirects to /login if there is no
// token, and blocks non-admins from /admin. Pages call this once and
// render their content as `children({ user })`.
export function AppShell({ children, requireRole }) {
  const router = useRouter();
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const token = getToken();
    const storedUser = getStoredUser();

    if (!token || !storedUser) {
      router.replace("/login");
      return;
    }
    if (requireRole && storedUser.role !== requireRole) {
      router.replace("/app");
      return;
    }
    setUser(storedUser);
  }, [router, requireRole]);

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold tracking-tight">RentFlow</span>
            <nav className="flex items-center gap-1 text-sm">
              <Button asChild variant="ghost" size="sm">
                <Link href="/app">Workspace</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/pricing">Pricing</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/account">Account</Link>
              </Button>
              {user.role === "admin" && (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin">Admin</Link>
                </Button>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={user.tier === "pro" ? "success" : "secondary"}>
              {user.tier === "pro" ? "Pro" : "Free"}
            </Badge>
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>
      </header>
      <div className="container py-8">{children({ user })}</div>
    </div>
  );
}
