import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { clearSession, getStoredUser, getToken } from "@/lib/api";

function NavIcon({ children }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true">
      {children}
    </svg>
  );
}

const ICONS = {
  home: (
    <>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9.5h13V10" />
    </>
  ),
  meters: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 12l3.5-3.5M12 6.5v1M6.5 12h1M17.5 12h-1" />
    </>
  ),
  invoices: (
    <>
      <path d="M6.5 3.5h8l4 4v13h-12z" />
      <path d="M14.5 3.5v4h4M9 12h6M9 15.5h6" />
    </>
  ),
  account: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
    </>
  ),
  admin: <path d="M5 20v-6M12 20V5M19 20v-9" />,
};

// Bottom tab bar on phones. "Home", "Readings" and "Invoices" are tabs of
// the /app workspace, selected with ?tab= (see pages/app.js).
function getNavItems(user) {
  const items = [
    { key: "home", label: "Home", href: "/app?tab=properties", icon: "home" },
    { key: "meters", label: "Readings", href: "/app?tab=meters", icon: "meters" },
    { key: "invoices", label: "Invoices", href: "/app?tab=invoices", icon: "invoices" },
    { key: "account", label: "Account", href: "/account", icon: "account" },
  ];
  if (user.role === "admin") {
    items.push({ key: "admin", label: "Admin", href: "/admin", icon: "admin" });
  }
  return items;
}

function getActiveKey(router) {
  const { pathname, query } = router;
  if (pathname === "/account") return "account";
  if (pathname === "/admin") return "admin";
  if (pathname === "/app") {
    if (query.tab === "meters") return "meters";
    if (query.tab === "invoices") return "invoices";
    return "home";
  }
  return null;
}

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

  const navItems = getNavItems(user);
  const activeKey = getActiveKey(router);

  return (
    <div className="min-h-dvh bg-muted/20">
      <header className="sticky top-0 z-30 border-b bg-background pt-[env(safe-area-inset-top)]">
        <div className="container flex items-center justify-between py-2 md:py-3">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold tracking-tight">RentFlow</span>
            <nav className="hidden items-center gap-1 text-sm md:flex">
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
          <div className="flex items-center gap-2 md:gap-3">
            {/* The plan badge doubles as the way to Pricing on phones. */}
            <Link href="/pricing" aria-label="Plan and pricing" className="-m-2 p-2">
              <Badge variant={user.tier === "pro" ? "success" : "secondary"}>
                {user.tier === "pro" ? "Pro" : "Free"}
              </Badge>
            </Link>
            <span className="hidden text-sm text-muted-foreground md:inline">{user.email}</span>
            <Button variant="outline" size="sm" className="h-10 md:h-9" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-4 pb-28 md:py-8 md:pb-8">{children({ user })}</div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="flex">
          {navItems.map((item) => {
            const active = item.key === activeKey;
            return (
              <li key={item.key} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-xs ${
                    active
                      ? "font-semibold text-foreground before:absolute before:inset-x-6 before:top-0 before:h-0.5 before:rounded-full before:bg-primary"
                      : "font-medium text-muted-foreground"
                  }`}>
                  <span className={active ? "text-primary" : undefined}>
                    <NavIcon>{ICONS[item.icon]}</NavIcon>
                  </span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
