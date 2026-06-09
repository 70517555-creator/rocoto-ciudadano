// Escanea UNA edición de SPIJ (por fecha) y devuelve solo las LEYES y DECRETOS
// PROMULGADOS, con su número real, título oficial y qué modifican. TODO sin IA.
// POST /api/escanear-leyes  con campo "fecha" (YYYY-MM-DD).

import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import {
  arreglarCodificacion,
  extraerLeyesPromulgadas,
  urlSpij,
} from "@/lib/normas-pdf";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const fecha = form.get("fecha");
    if (typeof fecha !== "string" || !fecha) {
      return NextResponse.json({ ok: false, mensaje: "Falta la fecha." }, { status: 400 });
    }

    const resp = await fetch(urlSpij(fecha));
    if (!resp.ok) {
      return NextResponse.json(
        { ok: false, mensaje: `Sin edición para ${fecha}.` },
        { status: 404 },
      );
    }

    const buffer = new Uint8Array(await resp.arrayBuffer());
    const pdf = await getDocumentProxy(buffer);
    const { text: crudo } = await extractText(pdf, { mergePages: true });
    const texto = arreglarCodificacion(crudo);

    const leyes = extraerLeyesPromulgadas(texto);
    return NextResponse.json({ ok: true, fecha, total: leyes.length, leyes });
  } catch (error) {
    return NextResponse.json(
      { ok: false, mensaje: "Error procesando la edición.", detalle: String(error) },
      { status: 500 },
    );
  }
}
