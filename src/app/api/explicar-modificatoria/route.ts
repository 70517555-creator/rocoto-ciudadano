// Toma una ley/decreto modificatorio (por fecha + número), lo traduce a las 3
// respuestas con la IA y lo guarda en Firebase con el chip ✏️. Curador únicamente.
// POST /api/explicar-modificatoria  { fecha, numero }

import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import {
  arreglarCodificacion,
  extraerLeyesPromulgadas,
  urlSpij,
} from "@/lib/normas-pdf";
import { traducirLey } from "@/lib/groq";
import { guardarLey } from "@/lib/leyes";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const { fecha, numero } = (await request.json()) as {
      fecha?: string;
      numero?: string;
    };
    if (!fecha || !numero) {
      return NextResponse.json(
        { ok: false, mensaje: "Falta fecha o número." },
        { status: 400 },
      );
    }

    // 1) Bajar la edición y ubicar la norma por su número (gratis, sin IA).
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

    const norma = extraerLeyesPromulgadas(texto).find((l) => l.numero === numero);
    if (!norma) {
      return NextResponse.json(
        { ok: false, mensaje: `No encontré la norma N° ${numero} en ${fecha}.` },
        { status: 404 },
      );
    }

    // 2) Traducir a las 3 respuestas (única llamada a IA).
    const traduccion = await traducirLey(norma.titulo, norma.texto);

    // 3) Guardar con el chip de modificatoria y el enlace a la fuente oficial.
    const id = await guardarLey(
      {
        numero: norma.numero,
        titulo: norma.titulo,
        fechaPublicacion: fecha,
        fuente: "Diario Oficial El Peruano / SPIJ",
        urlFuente: urlSpij(fecha),
        esModificatoria: norma.esModificatoria,
        modifica: norma.modifica,
      },
      traduccion,
    );

    return NextResponse.json({ ok: true, id, titulo: norma.titulo });
  } catch (error) {
    return NextResponse.json(
      { ok: false, mensaje: "No se pudo explicar la norma.", detalle: String(error) },
      { status: 500 },
    );
  }
}
