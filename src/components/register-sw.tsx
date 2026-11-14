"use client";

import { useEffect } from "react";

/** Enregistre le service worker (consultation hors ligne du dernier brief). */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
