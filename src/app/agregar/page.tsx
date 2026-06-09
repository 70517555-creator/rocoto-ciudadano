"use client";

import Link from "next/link";
import { useState } from "react";
import { RocotoLogo } from "@/components/RocotoLogo";
import {
  NaturalezaChip,
  SemaforoBolsillo,
  TemaChip,
} from "@/components/LeyEtiquetas";
import type { Traduccion } from "@/lib/groq";

type Resultado = {
  ok: boolean;
  id?: string;
  mensaje?: string;
  traduccion?: Traduccion;
};

export default function AgregarLey() {
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCargando(true);
    setResultado(null);

    const form = e.currentTarget;
    const datos = Object.fromEntries(new FormData(form).entries());

    try {
      const r = await fetch("/api/leyes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const json: Resultado = await r.json();
      setResultado(json);
      if (json.ok) form.reset();
    } catch (err) {
      setResultado({ ok: false, mensaje: String(err) });
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-10 bg-fondo/90 backdrop-blur border-b border-black/5">
        <div className="mx-auto max-w-3xl px-5 py-3">
          <Link href="/" className="flex items-center gap-2 text-rocoto">
            <RocotoLogo className="w-8 h-8" />
            <span className="font-display font-extrabold text-rocoto">
              Rocoto Ciudadano
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 py-8 flex-1">
        <Link href="/" className="text-sm text-tinta-suave hover:text-rocoto transition">
          ← Volver
        </Link>
        <h1 className="mt-3 font-display font-extrabold text-2xl sm:text-3xl text-tinta">
          Agregar una ley 🌶️
        </h1>
        <p className="mt-1 text-tinta-suave">
          Pega la norma tal como sale. La IA la convierte en las 3 respuestas
          ciudadanas y la guarda.
        </p>

        <form onSubmit={enviar} className="mt-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Campo nombre="numero" etiqueta="Número de ley *" placeholder="31572" />
            <Campo
              nombre="fechaPublicacion"
              etiqueta="Fecha de publicación"
              placeholder="5 de julio de 2023"
            />
          </div>
          <Campo
            nombre="titulo"
            etiqueta="Título oficial *"
            placeholder="Ley que promueve..."
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <Campo nombre="fuente" etiqueta="Fuente" placeholder="Diario Oficial El Peruano" />
            <Campo
              nombre="urlFuente"
              etiqueta="Enlace a la norma oficial"
              placeholder="https://..."
            />
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-tinta">Texto legal completo *</span>
            <textarea
              name="textoOriginal"
              rows={10}
              required
              placeholder="Pega aquí el texto de la ley tal como se publicó..."
              className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:border-rocoto focus:outline-none focus:ring-2 focus:ring-rocoto/20"
            />
          </label>

          <button
            type="submit"
            disabled={cargando}
            className="rounded-xl bg-rocoto text-white font-bold px-6 py-3 hover:bg-rocoto-dark transition disabled:opacity-60"
          >
            {cargando ? "Traduciendo con IA... 🌶️" : "Traducir y guardar"}
          </button>
        </form>

        {/* Resultado */}
        {resultado && resultado.ok && resultado.traduccion && (
          <div className="mt-8 rounded-2xl border border-tallo/30 bg-tallo-soft p-5">
            <p className="font-display font-bold text-tallo">
              ✅ ¡Listo! La ley se tradujo y guardó.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <SemaforoBolsillo impacto={resultado.traduccion.impactoBolsillo} />
              <TemaChip tema={resultado.traduccion.tema} />
              <NaturalezaChip naturaleza={resultado.traduccion.naturaleza} />
            </div>
            <div className="mt-3 space-y-2 text-sm text-tinta">
              <p><b>① Qué dice:</b> {resultado.traduccion.queDice}</p>
              <p><b>② A quién afecta:</b> {resultado.traduccion.aQuienAfecta}</p>
              <p><b>③ Cuánto cuesta:</b> {resultado.traduccion.cuantoCuesta}</p>
            </div>
            {resultado.id && (
              <Link
                href={`/ley/${resultado.id}`}
                className="mt-4 inline-block font-semibold text-rocoto"
              >
                Ver la ley publicada →
              </Link>
            )}
          </div>
        )}
        {resultado && !resultado.ok && (
          <div className="mt-8 rounded-2xl border border-rocoto/30 bg-rocoto-soft p-5 text-sm text-rocoto-dark">
            <b>No se pudo:</b> {resultado.mensaje}
          </div>
        )}
      </main>
    </div>
  );
}

// Un campo de texto reutilizable.
function Campo({
  nombre,
  etiqueta,
  placeholder,
}: {
  nombre: string;
  etiqueta: string;
  placeholder?: string;
}) {
  const obligatorio = etiqueta.includes("*");
  return (
    <label className="block">
      <span className="text-sm font-semibold text-tinta">{etiqueta}</span>
      <input
        name={nombre}
        required={obligatorio}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:border-rocoto focus:outline-none focus:ring-2 focus:ring-rocoto/20"
      />
    </label>
  );
}
