// Guarda en Firebase las normas que el curador eligió de la vista previa.
// NO llama a la IA (ya vienen traducidas desde /api/procesar-pdf): costo cero.
// POST /api/guardar-leyes  con { normas: NormaDetectada[] }

import { NextResponse } from "next/server";
import type { NormaDetectada } from "@/lib/groq";
import { guardarLey } from "@/lib/leyes";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const normas = (body.normas ?? []) as NormaDetectada[];

    if (!Array.isArray(normas) || normas.length === 0) {
      return NextResponse.json(
        { ok: false, mensaje: "No se eligió ninguna norma para guardar." },
        { status: 400 },
      );
    }

    const ids: string[] = [];
    for (const n of normas) {
      if (!n.numero || !n.titulo) continue;
      const id = await guardarLey(
        {
          numero: n.numero,
          titulo: n.titulo,
          fechaPublicacion: n.fechaPublicacion,
          fuente: "Diario Oficial El Peruano / SPIJ",
        },
        {
          queDice: n.queDice,
          aQuienAfecta: n.aQuienAfecta,
          aQuienBeneficia: n.aQuienBeneficia,
          cuantoCuesta: n.cuantoCuesta,
          tema: n.tema,
          impactoBolsillo: n.impactoBolsillo,
          naturaleza: n.naturaleza,
        },
      );
      ids.push(id);
    }

    return NextResponse.json({ ok: true, guardadas: ids.length, ids });
  } catch (error) {
    return NextResponse.json(
      { ok: false, mensaje: "No se pudieron guardar.", detalle: String(error) },
      { status: 500 },
    );
  }
}
