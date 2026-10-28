import { useEffect } from "react";
import Head from "next/head";

import { ToastProvider } from "@/components/ui/toaster";
import "@/styles/globals.css";

export default function App({ Component, pageProps }) {
  // Registers the PWA service worker (public/sw.js). It only handles page
  // navigations (offline fallback) and never caches API responses.
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <>
      <Head>
        <title>RentFlow</title>
        <meta
          name="description"
          content="Rent and utility billing for landlords with 3-50 units."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#EA550B" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="RentFlow" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </Head>
      <ToastProvider>
        <Component {...pageProps} />
      </ToastProvider>
    </>
  );
}
