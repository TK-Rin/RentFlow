import Head from "next/head";

import { ToastProvider } from "@/components/ui/toaster";
import "@/styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>RentFlow</title>
        <meta
          name="description"
          content="Rent and utility billing for landlords with 3-50 units."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <ToastProvider>
        <Component {...pageProps} />
      </ToastProvider>
    </>
  );
}
