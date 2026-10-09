import type { Metadata, Viewport } from "next";
import "@fontsource-variable/archivo/wdth.css";
import "./globals.css";
import { RegistrarServiceWorker } from "@/components/registrar-sw";

export const metadata: Metadata = {
  title: {
    default: "AutoCare: estéticas automotivas",
    template: "%s | AutoCare",
  },
  description: "Encontre a melhor estética automotiva perto de você e agende em poucos toques.",
  appleWebApp: {
    capable: true,
    title: "AutoCare",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#08121a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full">
        {children}
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
