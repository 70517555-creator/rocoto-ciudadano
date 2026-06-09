// Carga la lista de normas MODIFICATORIAS detectadas por el escáner (gratis, sin IA)
// y le agrega el enlace a la fuente oficial de SPIJ. Corre solo en el servidor.

import { readFileSync } from "node:fs";
import path from "node:path";
import { urlSpij } from "./normas-pdf";

export type CambioLegal = {
  fecha: string; // "YYYY-MM-DD" (día de promulgación)
  tipo: string; // "Ley" | "Decreto Legislativo" | "Decreto De Urgencia"
  numero: string;
  titulo: string;
  modifica: string[]; // qué normas cambia
  fuente: string; // enlace al PDF oficial de SPIJ de esa fecha
};

// Limpia referencias cortadas ("Decreto Supremo N° 007-2020-" → sin el guion final)
// y quita repetidas, para que la lista "modifica" se vea ordenada.
function limpiarModifica(refs: string[]): string[] {
  const vistos = new Set<string>();
  for (const r of refs) {
    const limpio = r.replace(/[\s.\-]+$/, "").trim();
    if (limpio) vistos.add(limpio);
  }
  return [...vistos];
}

const ARCHIVO = "leyes-modificatorias_2026-01-01_a_2026-06-07.json";

export function listarCambios(): CambioLegal[] {
  try {
    const ruta = path.join(process.cwd(), "data", ARCHIVO);
    const datos = JSON.parse(readFileSync(ruta, "utf8")) as Array<{
      fecha: string;
      tipo: string;
      numero: string;
      titulo: string;
      modifica: string[];
    }>;

    return datos
      .map((d) => ({
        fecha: d.fecha,
        tipo: d.tipo,
        numero: d.numero,
        titulo: d.titulo || "(sin título)",
        modifica: limpiarModifica(d.modifica ?? []),
        fuente: urlSpij(d.fecha),
      }))
      .sort((a, b) => b.fecha.localeCompare(a.fecha)); // más reciente primero
  } catch {
    return []; // si aún no se ha corrido el escáner, no rompemos la página
  }
}
