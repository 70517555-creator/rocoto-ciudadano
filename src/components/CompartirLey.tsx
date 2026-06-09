"use client";

// Botón de compartir: difunde la ley por WhatsApp / X / copiar enlace.
// Respeta la regla de oro: comparte HECHOS + la fuente, nunca una acusación.
// Si el dispositivo soporta compartir nativo (celular), también lo ofrece.

import { useEffect, useState } from "react";
import {
  WhatsappLogo,
  XLogo,
  LinkSimple,
  ShareNetwork,
  Check,
} from "@phosphor-icons/react/dist/ssr";

export function CompartirLey({
  titulo,
  numero,
}: {
  titulo: string;
  numero?: string;
}) {
  const [url, setUrl] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [hayNativo, setHayNativo] = useState(false);

  // El enlace y el soporte nativo solo existen en el navegador (no en el server).
  useEffect(() => {
    setUrl(window.location.href);
    setHayNativo(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  // Mensaje sobrio: qué ofrece la ficha + marca. Los hechos los lee en el enlace.
  const mensaje =
    `${titulo}${numero ? ` (N° ${numero})` : ""} — qué dice, a quién afecta y ` +
    `cuánto sale de tu bolsillo. Los hechos, con su fuente oficial. 🌶️ Rocoto Ciudadano`;
  const texto = `${mensaje}\n${url}`;

  const wa = `https://wa.me/?text=${encodeURIComponent(texto)}`;
  const x = `https://twitter.com/intent/tweet?text=${encodeURIComponent(texto)}`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* algunos navegadores bloquean el portapapeles; no pasa nada */
    }
  };

  const compartirNativo = async () => {
    try {
      await navigator.share({ title: "Rocoto Ciudadano", text: mensaje, url });
    } catch {
      /* el usuario canceló; sin problema */
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-tinta">
        <ShareNetwork className="w-4 h-4 text-rocoto" weight="bold" />
        Comparte el hecho:
      </span>

      <a
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] text-white text-sm font-bold px-3 py-2 hover:brightness-95 transition"
      >
        <WhatsappLogo className="w-4 h-4" weight="fill" /> WhatsApp
      </a>

      <a
        href={x}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg bg-tinta text-white text-sm font-bold px-3 py-2 hover:bg-black transition"
      >
        <XLogo className="w-4 h-4" weight="fill" /> X
      </a>

      <button
        type="button"
        onClick={copiar}
        className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white text-sm font-bold text-tinta px-3 py-2 hover:border-rocoto/40 hover:text-rocoto transition"
      >
        {copiado ? (
          <>
            <Check className="w-4 h-4 text-tallo" weight="bold" /> ¡Copiado!
          </>
        ) : (
          <>
            <LinkSimple className="w-4 h-4" weight="bold" /> Copiar enlace
          </>
        )}
      </button>

      {hayNativo && (
        <button
          type="button"
          onClick={compartirNativo}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rocoto/30 bg-rocoto-soft text-sm font-bold text-rocoto px-3 py-2 hover:bg-rocoto hover:text-white transition"
        >
          <ShareNetwork className="w-4 h-4" weight="bold" /> Más…
        </button>
      )}
    </div>
  );
}
