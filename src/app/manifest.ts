import type { MetadataRoute } from "next";

// Manifest PWA: permite "Agregar a pantalla de inicio" e instalar Rocoto como app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rocoto Ciudadano",
    short_name: "Rocoto",
    description:
      "Las leyes del Perú en lenguaje claro: qué dicen, a quién afectan y cuánto salen de tu bolsillo. Gratis, con su fuente oficial.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffcf7",
    theme_color: "#e0392b",
    lang: "es-PE",
    categories: ["news", "government", "education"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
