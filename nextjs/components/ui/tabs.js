import * as React from "react";

import { cn } from "@/lib/utils";

// Minimal hand-rolled tabs (no extra dependency) - context holds the
// active value, Tabs owns the state, everything else just reads it.
const TabsContext = React.createContext(null);

function Tabs({ value, defaultValue, onValueChange, className, children, ...props }) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const active = value !== undefined ? value : internalValue;

  function setActive(next) {
    if (value === undefined) setInternalValue(next);
    onValueChange?.(next);
  }

  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

function TabsList({ className, ...props }) {
  return (
    <div
      className={cn(
        "inline-flex h-10 items-center rounded-md bg-muted p-1 text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({ value, className, children, ...props }) {
  const ctx = React.useContext(TabsContext);
  const isActive = ctx.active === value;

  return (
    <button
      type="button"
      onClick={() => ctx.setActive(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
        isActive ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function TabsContent({ value, className, children, ...props }) {
  const ctx = React.useContext(TabsContext);
  if (ctx.active !== value) return null;

  return (
    <div className={cn("mt-4", className)} {...props}>
      {children}
    </div>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
