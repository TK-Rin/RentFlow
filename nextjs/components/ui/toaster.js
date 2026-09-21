import * as React from "react";

import { cn } from "@/lib/utils";

const ToastContext = React.createContext(null);
let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);

  const toast = React.useCallback(({ title, description, variant = "default" }) => {
    const id = ++idCounter;
    setToasts((current) => [...current, { id, title, description, variant }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "rounded-md border p-4 shadow-lg",
              t.variant === "destructive"
                ? "border-red-200 bg-red-50 text-red-900"
                : "border-border bg-background text-foreground"
            )}
          >
            {t.title && <p className="text-sm font-semibold">{t.title}</p>}
            {t.description && <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const toast = React.useContext(ToastContext);
  if (!toast) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return { toast };
}
