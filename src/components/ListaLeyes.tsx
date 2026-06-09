"use client";

// Lista de leyes con buscador, filtro por tema, filtro por mes y orden por fecha.
// Recibe las leyes ya cargadas desde el servidor (la portada se las pasa).

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  MagnifyingGlass,
  ArrowDown,
  ArrowUp,
  CalendarBlank,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react/dist/ssr";
import {
  ICONO_TEMA,
  ModificaChip,
  NaturalezaChip,
  SemaforoBolsillo,
  TemaChip,
} from "./LeyEtiquetas";
import type { Ley } from "@/lib/leyes";
import type { Tema } from "@/lib/groq";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const MESES_CORTO = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

// Momento de la ley para ordenar: usamos la fecha de publicación si es ISO;
// si no, cuándo se guardó. Devuelve milisegundos (0 si no hay nada).
function momentoDe(ley: Ley): number {
  const f = ley.fechaPublicacion;
  if (f && /^\d{4}-\d{2}-\d{2}/.test(f)) return new Date(f).getTime();
  if (ley.creadoEn) return new Date(ley.creadoEn).getTime();
  return 0;
}
// Mes "YYYY-MM" de la ley (para el filtro), o null si no se sabe.
function mesDe(ley: Ley): string | null {
  const f = ley.fechaPublicacion;
  if (f && /^\d{4}-\d{2}/.test(f)) return f.slice(0, 7);
  if (ley.creadoEn) return ley.creadoEn.slice(0, 7);
  return null;
}
// "2026-02" → "Febrero 2026"
function mesLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const n = MESES[Number(m) - 1];
  return `${n[0].toUpperCase()}${n.slice(1)} ${y}`;
}
// Día "YYYY-MM-DD" de la ley (para agrupar), o "sin-fecha" si no se sabe.
function diaDe(ley: Ley): string {
  const f = ley.fechaPublicacion;
  if (f && /^\d{4}-\d{2}-\d{2}/.test(f)) return f.slice(0, 10);
  if (ley.creadoEn) return ley.creadoEn.slice(0, 10);
  return "sin-fecha";
}
// "2026-06-05" → "5 de junio de 2026"; "sin-fecha" → "Sin fecha".
function diaLabel(d: string): string {
  if (d === "sin-fecha") return "Sin fecha";
  const [y, m, dd] = d.split("-");
  return `${Number(dd)} de ${MESES[Number(m) - 1]} de ${y}`;
}
// "2026-06-05" → "5 jun" (para la tira de fechas del carrusel).
function diaCorto(d: string): string {
  if (d === "sin-fecha") return "Sin fecha";
  const [, m, dd] = d.split("-");
  return `${Number(dd)} ${MESES_CORTO[Number(m) - 1]}`;
}
// "2026-02-12" → "12 feb 2026"; si no es ISO, lo deja igual.
function fechaBonita(f?: string): string | null {
  if (!f) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(f)) {
    const [y, m, d] = f.split("-");
    return `${Number(d)} ${MESES_CORTO[Number(m) - 1]} ${y}`;
  }
  return f;
}

// "hace X días / semanas / meses" a partir de una fecha ISO.
function hace(f?: string): string | null {
  if (!f || !/^\d{4}-\d{2}-\d{2}/.test(f)) return fechaBonita(f);
  const dias = Math.floor((Date.now() - new Date(f).getTime()) / 86400000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 7) return `hace ${dias} días`;
  if (dias < 30) {
    const s = Math.floor(dias / 7);
    return `hace ${s} semana${s > 1 ? "s" : ""}`;
  }
  if (dias < 365) {
    const m = Math.floor(dias / 30);
    return `hace ${m} mes${m > 1 ? "es" : ""}`;
  }
  const a = Math.floor(dias / 365);
  return `hace ${a} año${a > 1 ? "s" : ""}`;
}

// Pasa un título OFICIAL EN MAYÚSCULAS a algo legible, conservando siglas cortas.
function aLegible(t: string): string {
  const partes = t.split(/(\s+)/).map((w) => {
    const esSigla = /[A-ZÁÉÍÓÚÑ]/.test(w) && /^[A-ZÁÉÍÓÚÑ0-9°º.\-()/]{2,5}$/.test(w);
    return esSigla ? w : w.toLowerCase();
  });
  return partes.join("").replace(/^(\s*)([a-záéíóúñ])/, (_, sp, c) => sp + c.toUpperCase());
}

export function ListaLeyes({ leyes }: { leyes: Ley[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [temaActivo, setTemaActivo] = useState<Tema | null>(null);
  const [mesActivo, setMesActivo] = useState<string | null>(null);
  const [orden, setOrden] = useState<"reciente" | "antigua">("reciente");
  const [diaActivo, setDiaActivo] = useState<string | null>(null);

  const temasDisponibles = useMemo(() => {
    const conteo = new Map<Tema, number>();
    for (const ley of leyes) {
      if (ley.tema) conteo.set(ley.tema, (conteo.get(ley.tema) ?? 0) + 1);
    }
    return [...conteo.entries()].sort((a, b) => b[1] - a[1]);
  }, [leyes]);

  // Meses disponibles (de más reciente a más antiguo) con su conteo.
  const mesesDisponibles = useMemo(() => {
    const conteo = new Map<string, number>();
    for (const ley of leyes) {
      const m = mesDe(ley);
      if (m) conteo.set(m, (conteo.get(m) ?? 0) + 1);
    }
    return [...conteo.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [leyes]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const arr = leyes.filter((ley) => {
      if (temaActivo && ley.tema !== temaActivo) return false;
      if (mesActivo && mesDe(ley) !== mesActivo) return false;
      if (!q) return true;
      return [ley.titulo, ley.numero, ley.tema, ley.queDice]
        .filter(Boolean)
        .some((campo) => (campo as string).toLowerCase().includes(q));
    });
    // Orden por fecha de la ley.
    arr.sort((a, b) =>
      orden === "reciente" ? momentoDe(b) - momentoDe(a) : momentoDe(a) - momentoDe(b),
    );
    return arr;
  }, [busqueda, temaActivo, mesActivo, orden, leyes]);

  // Agrupa las visibles por día (conservando el orden ya aplicado) para mostrar
  // un subtítulo de fecha encima de cada bloque, así no se mezclan los días.
  const grupos = useMemo(() => {
    const mapa = new Map<string, Ley[]>();
    for (const ley of visibles) {
      const d = diaDe(ley);
      if (!mapa.has(d)) mapa.set(d, []);
      mapa.get(d)!.push(ley);
    }
    return [...mapa.entries()]; // ya viene ordenado por el orden de "visibles"
  }, [visibles]);

  // Día mostrado en el carrusel: el seleccionado si sigue existiendo; si no
  // (cambió un filtro), cae al primero. El índice mueve el slide (translateX).
  const indiceActivo = Math.max(
    0,
    grupos.findIndex(([d]) => d === diaActivo),
  );
  const irADia = (i: number) => {
    const g = grupos[i];
    if (g) setDiaActivo(g[0]);
  };

  // Centra la ficha de fecha activa en la tira cada vez que cambia el día.
  const fichaActivaRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    fichaActivaRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [indiceActivo]);

  // El carrusel toma el alto SOLO del día activo (no del más grande), así no
  // queda un hueco enorme en días con pocas leyes. Mide el panel activo y anima.
  const panelesRef = useRef<(HTMLElement | null)[]>([]);
  const [altoCarrusel, setAltoCarrusel] = useState<number | undefined>(undefined);
  useEffect(() => {
    const medir = () => {
      const el = panelesRef.current[indiceActivo];
      if (el) setAltoCarrusel(el.offsetHeight);
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [indiceActivo, grupos]);

  return (
    <div>
      {/* Buscador */}
      <div className="relative mb-4">
        <MagnifyingGlass
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-tinta-suave"
          weight="bold"
        />
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por palabra clave o número de ley…"
          className="w-full rounded-lg border border-black/10 bg-white pl-11 pr-4 py-3.5 text-tinta placeholder:text-tinta-suave shadow-sm focus:outline-none focus:border-rocoto/40 focus:ring-4 focus:ring-rocoto/10"
        />
      </div>

      {/* Filtro por fecha (mes) + orden */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <CalendarBlank
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tinta-suave"
            weight="fill"
          />
          <select
            value={mesActivo ?? ""}
            onChange={(e) => setMesActivo(e.target.value || null)}
            className="appearance-none rounded-lg border border-black/10 bg-white text-sm font-bold text-tinta pl-9 pr-8 py-2 cursor-pointer hover:border-rocoto/40 focus:outline-none focus:border-rocoto/40"
          >
            <option value="">Todas las fechas</option>
            {mesesDisponibles.map(([m, n]) => (
              <option key={m} value={m}>
                {mesLabel(m)} ({n})
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setOrden((o) => (o === "reciente" ? "antigua" : "reciente"))}
          className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white text-sm font-bold text-tinta px-3 py-2 hover:border-rocoto/40 hover:text-rocoto transition"
        >
          {orden === "reciente" ? (
            <>
              <ArrowDown className="w-4 h-4" weight="bold" /> Más recientes primero
            </>
          ) : (
            <>
              <ArrowUp className="w-4 h-4" weight="bold" /> Más antiguas primero
            </>
          )}
        </button>
      </div>

      {/* Filtro por tema */}
      {temasDisponibles.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <BotonTema activo={temaActivo === null} onClick={() => setTemaActivo(null)}>
            Todas ({leyes.length})
          </BotonTema>
          {temasDisponibles.map(([tema, cuenta]) => {
            const Icono = ICONO_TEMA[tema];
            return (
              <BotonTema
                key={tema}
                activo={temaActivo === tema}
                onClick={() => setTemaActivo(tema)}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Icono className="w-4 h-4" weight="fill" /> {tema} ({cuenta})
                </span>
              </BotonTema>
            );
          })}
        </div>
      )}

      {visibles.length === 0 ? (
        <p className="text-tinta-suave">
          {busqueda
            ? `No encontré ninguna ley con “${busqueda}”.`
            : "No hay leyes con ese filtro todavía."}{" "}
          Prueba con otro filtro.
        </p>
      ) : (
        <div>
          {/* === Carrusel: un día a la vez, se desliza al cambiar de fecha === */}
          <div
            className="overflow-hidden transition-[height] duration-300 ease-out"
            style={{ height: altoCarrusel }}
          >
            <div
              className="flex items-start transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${indiceActivo * 100}%)` }}
            >
              {grupos.map(([dia, leyesDia], i) => (
                <section
                  key={dia}
                  ref={(el) => {
                    panelesRef.current[i] = el;
                  }}
                  className="w-full shrink-0"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <h3 className="inline-flex items-center gap-1.5 font-display font-bold text-tinta">
                      <CalendarBlank className="w-4 h-4 text-rocoto" weight="fill" />
                      {diaLabel(dia)}
                    </h3>
                    <span className="rounded-md bg-rocoto-soft text-rocoto text-xs font-bold px-2 py-0.5">
                      {leyesDia.length} {leyesDia.length === 1 ? "ley" : "leyes"}
                    </span>
                    <span className="h-px flex-1 bg-black/10" />
                  </div>
                  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {leyesDia.map((ley) => (
                      <li key={ley.id}>
                        <TarjetaLey ley={ley} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>

          {/* === Tira de fechas: fichas de calendario, se centra en la activa === */}
          {grupos.length > 1 && (
            <div className="mt-8 rounded-2xl border border-black/5 bg-white/60 px-2 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => irADia(indiceActivo - 1)}
                  disabled={indiceActivo === 0}
                  aria-label="Día anterior"
                  className="shrink-0 grid place-items-center w-9 h-9 rounded-full border border-black/10 bg-white text-tinta hover:border-rocoto/40 hover:text-rocoto disabled:opacity-30 disabled:hover:border-black/10 disabled:hover:text-tinta transition"
                >
                  <CaretLeft className="w-4 h-4" weight="bold" />
                </button>

                <div className="flex-1 overflow-x-auto scroll-smooth scrollbar-none">
                  <div className="flex gap-2 w-max px-1 py-1">
                    {grupos.map(([dia, leyesDia], i) => {
                      const activo = i === indiceActivo;
                      const [, mm, dd] = dia.split("-");
                      const num = dia === "sin-fecha" ? "—" : String(Number(dd));
                      const mes = dia === "sin-fecha" ? "" : MESES_CORTO[Number(mm) - 1];
                      return (
                        <button
                          key={dia}
                          ref={activo ? fichaActivaRef : undefined}
                          type="button"
                          onClick={() => setDiaActivo(dia)}
                          aria-label={diaLabel(dia)}
                          className={`relative shrink-0 w-15 rounded-xl border px-2 py-2 text-center transition ${
                            activo
                              ? "bg-rocoto border-rocoto text-white shadow-md shadow-rocoto/25"
                              : "bg-white border-black/10 text-tinta hover:border-rocoto/40 hover:-translate-y-0.5"
                          }`}
                        >
                          <div className="font-display font-extrabold text-xl leading-none">
                            {num}
                          </div>
                          <div
                            className={`mt-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              activo ? "text-white/80" : "text-tinta-suave"
                            }`}
                          >
                            {mes}
                          </div>
                          <div
                            className={`mx-auto mt-1.5 grid place-items-center min-w-4.5 h-4.5 rounded-full text-[10px] font-bold px-1 ${
                              activo ? "bg-white/25 text-white" : "bg-rocoto-soft text-rocoto"
                            }`}
                          >
                            {leyesDia.length}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => irADia(indiceActivo + 1)}
                  disabled={indiceActivo === grupos.length - 1}
                  aria-label="Día siguiente"
                  className="shrink-0 grid place-items-center w-9 h-9 rounded-full border border-black/10 bg-white text-tinta hover:border-rocoto/40 hover:text-rocoto disabled:opacity-30 disabled:hover:border-black/10 disabled:hover:text-tinta transition"
                >
                  <CaretRight className="w-4 h-4" weight="bold" />
                </button>
              </div>

              {/* Fecha activa en palabras, para que quede claro qué día se ve */}
              <p className="mt-2.5 text-center text-xs font-semibold text-tinta-suave">
                {diaLabel(grupos[indiceActivo]?.[0] ?? "")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BotonTema({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg text-sm font-bold px-3.5 py-1.5 transition ${
        activo
          ? "bg-rocoto text-white"
          : "bg-white text-tinta border border-black/10 hover:border-rocoto/40 hover:text-rocoto"
      }`}
    >
      {children}
    </button>
  );
}

function TarjetaLey({ ley }: { ley: Ley }) {
  const cuando = hace(ley.fechaPublicacion);
  return (
    <Link
      href={`/ley/${ley.id}`}
      className="group flex h-full flex-col rounded-lg bg-white border border-black/5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition p-5"
    >
      {/* Fila superior: tema (izq) + semáforo del bolsillo = "coste" (der) */}
      <div className="flex items-start justify-between gap-2">
        <TemaChip tema={ley.tema} />
        <SemaforoBolsillo impacto={ley.impactoBolsillo} />
      </div>

      <h3 className="mt-3 font-display font-bold text-lg text-tinta leading-snug group-hover:text-rocoto-dark transition">
        {aLegible(ley.titulo)}
      </h3>

      {/* Naturaleza / modifica + cuándo se publicó */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <NaturalezaChip naturaleza={ley.naturaleza} />
        <ModificaChip esModificatoria={ley.esModificatoria} />
        {cuando && (
          <span className="inline-flex items-center gap-1 text-xs text-tinta-suave">
            <CalendarBlank className="w-3.5 h-3.5" weight="fill" /> {cuando}
          </span>
        )}
      </div>

      {ley.queDice && (
        <p className="mt-3 text-sm text-tinta-suave line-clamp-3">{ley.queDice}</p>
      )}

      <span className="mt-3 text-xs font-bold text-tinta-suave">N° {ley.numero}</span>

      <span className="mt-auto pt-4">
        <span className="block w-full rounded-md bg-rocoto text-white text-center text-sm font-bold py-2.5 group-hover:bg-rocoto-dark transition">
          Leer Traducción
        </span>
      </span>
    </Link>
  );
}
