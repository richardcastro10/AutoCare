"use client";

import { useEffect } from "react";

// Registra o service worker (public/sw.js), necessário pro "Instalar app" no celular
export function RegistrarServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
