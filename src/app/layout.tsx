import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import "./globals.css";

// Tipografía de títulos: Baloo 2 (redondeada, cálida, peruana sin cliché).
const display = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

// Tipografía de texto: Nunito (muy legible, amigable).
const sans = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rocoto Ciudadano — Acceso Claro a la Ley",
  description:
    "Le metemos picante a la ley para que la entiendas. Traducimos las leyes del Perú a lenguaje claro: qué dice, a quién afecta y cuánto sale de tu bolsillo.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Rocoto",
    statusBarStyle: "default",
  },
};

// Color de la barra del navegador / app instalada (rojo rocoto).
export const viewport: Viewport = {
  themeColor: "#e0392b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
