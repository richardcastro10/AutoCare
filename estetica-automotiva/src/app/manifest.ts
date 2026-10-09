import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AutoCare: estéticas automotivas",
    short_name: "AutoCare",
    description: "Encontre a melhor estética automotiva perto de você e agende em poucos toques.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#08121a",
    theme_color: "#08121a",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icone-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icone-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Meus agendamentos", url: "/meus-agendamentos" },
    ],
  };
}
