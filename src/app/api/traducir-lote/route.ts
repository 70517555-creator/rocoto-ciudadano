// Traduce UN lote de normas con la IA. El cliente la llama una vez por lote,
// con pausa entre cada una, para respetar el límite de tokens del plan gratis.
// POST /api/traducir-lote  con { texto: string }

import { NextResponse } from "next/server";
import { traducirLote } from "@/lib/groq";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const { texto } = await request.json();
    if (!texto || typeof texto !== "string") {
      return NextResponse.json(
        { ok: false, mensaje: "Falta el texto del lote." },
        { status: 400 },
      );
    }

    const normas = await traducirLote(texto);
    return NextResponse.json({ ok: true, normas });
  } catch (error) {
    return NextResponse.json(
      { ok: false, mensaje: "No se pudo traducir el lote.", detalle: String(error) },
      { status: 500 },
    );
  }
}
