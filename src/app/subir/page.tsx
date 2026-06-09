"use client";

import Link from "next/link";
import { useState } from "react";
import { RocotoLogo } from "@/components/RocotoLogo";
import {
  NaturalezaChip,
  SemaforoBolsillo,
  TemaChip,
} from "@/components/LeyEtiquetas";
import type { NormaDetectada } from "@/lib/groq";

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Una norma cruda detectada (antes de traducir).
type NormaCruda = { tipo: string; numero: string; sumilla: string; texto: string };

// Agrupa las normas elegidas en lotes que quepan en el plan gratis de Groq.
// Lotes chicos = cada llamada usa pocos tokens y choca menos con el límite.
function agruparEnLotes(normas: NormaCruda[], max = 5000): string[] {
  const lotes: string[] = [];
  let actual = "";
  for (const n of normas) {
    const trozo = `\n\n### ${n.tipo} N° ${n.numero}\n${n.texto}`;
    if (actual.length + trozo.length > max && actual) {
      lotes.push(actual);
      actual = "";
    }
    actual += trozo;
  }
  if (actual.trim()) lotes.push(actual);
  return lotes;
}

export default function SubirEdicion() {
  const [fase, setFase] = useState<"inicio" | "eligiendo" | "traduciendo" | "revisar">(
    "inicio",
  );
  const [error, setError] = useState<string | null>(null);

  // Paso 1: candidatas detectadas y cuáles marcó el curador para traducir.
  const [candidatas, setCandidatas] = useState<NormaCruda[]>([]);
  const [paraTraducir, setParaTraducir] = useState<Set<string>>(new Set());

  // Paso 2: traducción.
  const [progreso, setProgreso] = useState({ hecho: 0, total: 0 });
  const [normas, setNormas] = useState<NormaDetectada[]>([]);
  const [paraGuardar, setParaGuardar] = useState<Set<string>>(new Set());
  const [guardando, setGuardando] = useState(false);
  const [guardadas, setGuardadas] = useState<number | null>(null);

  // === Paso 1: bajar/subir el PDF y detectar las normas (sin IA). ===
  async function analizar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNormas([]);
    setGuardadas(null);

    const form = e.currentTarget;
    const fecha = (form.elements.namedItem("fecha") as HTMLInputElement).value;
    const archivo = (form.elements.namedItem("pdf") as HTMLInputElement).files?.[0];
    if (!fecha && !archivo) {
      setError("Elige una fecha de SPIJ o sube un PDF.");
      return;
    }

    setFase("eligiendo");
    setCandidatas([]);
    try {
      const datos = new FormData();
      if (fecha) datos.append("fecha", fecha);
      else if (archivo) datos.append("pdf", archivo);
      const r = await fetch("/api/procesar-pdf", { method: "POST", body: datos });
      const json = await r.json();
      if (!json.ok) {
        setError(json.mensaje ?? "No se pudo procesar.");
        setFase("inicio");
        return;
      }
      if (!json.normas || json.normas.length === 0) {
        setError("No detecté normas relevantes para el ciudadano en este PDF.");
        setFase("inicio");
        return;
      }
      setCandidatas(json.normas);
      setParaTraducir(new Set()); // que el curador elija a propósito
    } catch (err) {
      setError(String(err));
      setFase("inicio");
    }
  }

  function alternarTraducir(numero: string) {
    setParaTraducir((prev) => {
      const c = new Set(prev);
      if (c.has(numero)) c.delete(numero);
      else c.add(numero);
      return c;
    });
  }

  // === Paso 2: traducir SOLO las elegidas, por lotes, con reintento. ===
  async function traducirElegidas() {
    const elegidas = candidatas.filter((n) => paraTraducir.has(n.numero));
    if (elegidas.length === 0) {
      setError("Marca al menos una norma para traducir.");
      return;
    }
    setError(null);
    setFase("traduciendo");

    const lotes = agruparEnLotes(elegidas);
    setProgreso({ hecho: 0, total: lotes.length });
    const acumulado: NormaDetectada[] = [];

    let motivoFalla = "";
    const traducirUno = async (texto: string): Promise<boolean> => {
      try {
        const r = await fetch("/api/traducir-lote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texto }),
        });
        const json = await r.json();
        if (json.ok && Array.isArray(json.normas)) {
          acumulado.push(...json.normas);
          setNormas([...acumulado]);
          setParaGuardar(new Set(acumulado.map((n) => n.numero)));
          return true;
        }
        motivoFalla = json.detalle || json.mensaje || "";
      } catch (e) {
        motivoFalla = String(e);
      }
      return false;
    };

    const fallidos: string[] = [];
    for (let i = 0; i < lotes.length; i++) {
      const ok = await traducirUno(lotes[i]);
      if (!ok) {
        // Si Groq está saturado (cupo del día), no vale la pena seguir: paramos.
        if (motivoFalla.includes("saturado")) {
          setError(
            "Groq está saturado (se agotó el cupo gratis del día por tanto uso de hoy). Guarda lo que ya salió y vuelve a intentar más tarde. 🌶️",
          );
          setFase("revisar");
          return;
        }
        fallidos.push(lotes[i]);
      }
      setProgreso({ hecho: i + 1, total: lotes.length });
      // Pausa entre lotes para mantenernos bajo el límite de tokens por minuto.
      if (i < lotes.length - 1) await esperar(12000);
    }

    // Segunda pasada para los que fallaron por el límite momentáneo.
    let pendientes = fallidos;
    if (pendientes.length > 0) {
      await esperar(8000);
      const aunFallan: string[] = [];
      for (const texto of pendientes) {
        if (!(await traducirUno(texto))) aunFallan.push(texto);
        await esperar(3000);
      }
      pendientes = aunFallan;
    }

    if (pendientes.length > 0) {
      setError(
        `${pendientes.length} lote(s) no se pudieron traducir por el límite gratis. Guarda lo que ya salió; puedes reintentar el resto en un minuto.`,
      );
    }
    setFase("revisar");
  }

  function alternarGuardar(numero: string) {
    setParaGuardar((prev) => {
      const c = new Set(prev);
      if (c.has(numero)) c.delete(numero);
      else c.add(numero);
      return c;
    });
  }

  async function guardar() {
    const seleccion = normas.filter((n) => paraGuardar.has(n.numero));
    if (seleccion.length === 0) {
      setError("No has marcado ninguna norma.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const r = await fetch("/api/guardar-leyes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ normas: seleccion }),
      });
      const json = await r.json();
      if (!json.ok) {
        setError(json.mensaje ?? "No se pudo guardar.");
        return;
      }
      setGuardadas(json.guardadas);
    } catch (err) {
      setError(String(err));
    } finally {
      setGuardando(false);
    }
  }

  const ocupado = fase === "eligiendo" || fase === "traduciendo";

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-10 bg-fondo/90 backdrop-blur border-b border-black/5">
        <div className="mx-auto max-w-4xl px-5 py-3">
          <Link href="/" className="flex items-center gap-2 text-rocoto">
            <RocotoLogo className="w-8 h-8" />
            <span className="font-display font-extrabold text-rocoto">
              Rocoto Ciudadano
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-5 py-8 flex-1">
        <Link href="/" className="text-sm text-tinta-suave hover:text-rocoto transition">
          ← Volver
        </Link>
        <h1 className="mt-3 font-display font-extrabold text-2xl sm:text-3xl text-tinta">
          Subir edición (PDF) 🌶️
        </h1>
        <p className="mt-1 text-tinta-suave">
          Baja la edición de SPIJ por fecha (o sube el PDF). Detectamos las normas
          que importan, tú eliges cuáles traducir y la IA hace el resto.
        </p>

        {/* === Paso 1: formulario === */}
        <form
          onSubmit={analizar}
          className="mt-6 rounded-2xl border border-black/10 bg-white p-5"
        >
          <label className="block">
            <span className="text-sm font-semibold text-tinta">
              📅 Bajar de SPIJ por fecha (automático)
            </span>
            <input
              type="date"
              name="fecha"
              max={new Date().toISOString().slice(0, 10)}
              disabled={ocupado}
              className="mt-2 block w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-rocoto focus:outline-none focus:ring-2 focus:ring-rocoto/20"
            />
          </label>

          <div className="my-4 flex items-center gap-3 text-xs text-tinta-suave">
            <span className="h-px flex-1 bg-black/10" /> o sube el archivo{" "}
            <span className="h-px flex-1 bg-black/10" />
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-tinta">Archivo PDF</span>
            <input
              type="file"
              name="pdf"
              accept="application/pdf"
              disabled={ocupado}
              className="mt-2 block w-full text-sm text-tinta file:mr-3 file:rounded-xl file:border-0 file:bg-rocoto file:text-white file:font-bold file:px-4 file:py-2 hover:file:bg-rocoto-dark file:cursor-pointer"
            />
          </label>

          <button
            type="submit"
            disabled={ocupado}
            className="mt-4 rounded-xl bg-rocoto text-white font-bold px-6 py-3 hover:bg-rocoto-dark transition disabled:opacity-60"
          >
            {fase === "eligiendo"
              ? "Leyendo el PDF..."
              : fase === "traduciendo"
                ? "Traduciendo..."
                : "Analizar"}
          </button>
        </form>

        {error && (
          <div className="mt-6 rounded-2xl border border-rocoto/30 bg-rocoto-soft p-4 text-sm text-rocoto-dark">
            <b>Aviso:</b> {error}
          </div>
        )}

        {guardadas !== null && (
          <div className="mt-6 rounded-2xl border border-tallo/30 bg-tallo-soft p-5">
            <p className="font-display font-bold text-tallo">
              ✅ ¡Listo! Se guardaron {guardadas} norma(s).
            </p>
            <Link href="/" className="mt-2 inline-block font-semibold text-rocoto">
              Ver en la portada →
            </Link>
          </div>
        )}

        {/* === Paso 1.5: elegir cuáles traducir === */}
        {fase === "eligiendo" && candidatas.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="font-display font-bold text-xl text-tinta">
                {candidatas.length} normas relevantes — elige cuáles traducir
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setParaTraducir(new Set(candidatas.map((n) => n.numero)))
                  }
                  className="text-sm font-semibold text-tinta-suave hover:text-rocoto"
                >
                  Marcar todas
                </button>
                <span className="text-tinta-suave">·</span>
                <button
                  onClick={() => setParaTraducir(new Set())}
                  className="text-sm font-semibold text-tinta-suave hover:text-rocoto"
                >
                  Ninguna
                </button>
              </div>
            </div>
            <p className="mt-1 text-sm text-tinta-suave">
              💡 Cada una que marques usa IA. Traduce solo lo que de verdad le sirva
              al ciudadano.
            </p>

            <ul className="mt-4 space-y-2">
              {candidatas.map((n) => {
                const marcada = paraTraducir.has(n.numero);
                return (
                  <li key={n.numero}>
                    <label
                      className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                        marcada
                          ? "border-rocoto/40 bg-rocoto-soft"
                          : "border-black/10 bg-white hover:bg-black/2"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={marcada}
                        onChange={() => alternarTraducir(n.numero)}
                        className="mt-0.5 w-5 h-5 accent-rocoto"
                      />
                      <div>
                        <span className="text-xs font-bold text-rocoto-dark">
                          {n.tipo} N° {n.numero}
                        </span>
                        <p className="text-sm text-tinta leading-snug">
                          {n.sumilla || "(sin título)"}
                        </p>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>

            <div className="sticky bottom-4 mt-4">
              {paraTraducir.size > 6 && (
                <p className="mb-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2">
                  ⏳ Son bastantes. En el plan gratis se traducen de a poco
                  (~12s por lote), así que puede tardar varios minutos. Si tienes
                  apuro, elige menos (3-6) por ahora.
                </p>
              )}
              <button
                onClick={traducirElegidas}
                disabled={paraTraducir.size === 0}
                className="w-full rounded-xl bg-tallo text-white font-bold px-6 py-3 shadow-lg hover:brightness-95 transition disabled:opacity-50"
              >
                Traducir {paraTraducir.size} seleccionada(s) con IA 🌶️
              </button>
            </div>
          </section>
        )}

        {/* === Paso 2: progreso de traducción === */}
        {fase === "traduciendo" && (
          <section className="mt-8 rounded-2xl border border-black/10 bg-white p-5">
            <p className="text-sm text-tinta-suave">
              Traduciendo lote {progreso.hecho} de {progreso.total}... (con pausas
              para respetar el plan gratis)
            </p>
            <div className="mt-2 h-2 rounded-full bg-black/10 overflow-hidden">
              <div
                className="h-full bg-tallo transition-all"
                style={{
                  width: progreso.total
                    ? `${(progreso.hecho / progreso.total) * 100}%`
                    : "0%",
                }}
              />
            </div>
          </section>
        )}

        {/* === Paso 3: revisar y guardar lo traducido === */}
        {fase === "revisar" && normas.length > 0 && guardadas === null && (
          <section className="mt-8">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="font-display font-bold text-xl text-tinta">
                {normas.length} norma(s) traducida(s)
              </h2>
              <button
                onClick={guardar}
                disabled={guardando}
                className="rounded-xl bg-tallo text-white font-bold px-5 py-2.5 hover:brightness-95 transition disabled:opacity-60"
              >
                {guardando ? "Guardando..." : `Guardar ${paraGuardar.size} seleccionada(s)`}
              </button>
            </div>

            <ul className="mt-4 space-y-4">
              {normas.map((n) => {
                const marcada = paraGuardar.has(n.numero);
                return (
                  <li
                    key={n.numero}
                    className={`rounded-2xl border p-5 transition ${
                      marcada
                        ? "border-tallo/40 bg-white"
                        : "border-black/10 bg-black/2 opacity-60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={marcada}
                        onChange={() => alternarGuardar(n.numero)}
                        className="mt-1.5 w-5 h-5 accent-tallo cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-rocoto text-white text-xs font-bold px-2.5 py-1">
                            {n.tipo} N° {n.numero}
                          </span>
                          {n.fechaPublicacion && (
                            <span className="text-xs text-tinta-suave">
                              📅 {n.fechaPublicacion}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-2 font-display font-bold text-tinta leading-snug">
                          {n.titulo}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <SemaforoBolsillo impacto={n.impactoBolsillo} />
                          <TemaChip tema={n.tema} />
                          <NaturalezaChip naturaleza={n.naturaleza} />
                        </div>
                        <p className="mt-3 text-sm text-tinta-suave">{n.queDice}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
