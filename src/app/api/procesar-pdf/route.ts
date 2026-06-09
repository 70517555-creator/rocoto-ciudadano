// Recibe un PDF (edición de SPIJ / El Peruano), extrae su texto, lo corta en
// normas y descarta lo irrelevante. TODO sin IA (gratis). Devuelve "lotes" de
// texto listos para que el cliente los mande a traducir uno por uno.
// POST /api/procesar-pdf  (multipart/form-data con campo "pdf")

import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import {
  arreglarCodificacion,
  detectarModificatoria,
  esRelevante,
  extraerNormas,
  recortar,
  urlSpij,
} from "@/lib/normas-pdf";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const archivo = form.get("pdf");
    const fecha = form.get("fecha");

    // El PDF puede venir de dos formas: subido a mano, o bajado de SPIJ por fecha.
    let buffer: Uint8Array;

    if (typeof fecha === "string" && fecha) {
      // Bajar automáticamente el PDF oficial de SPIJ para esa fecha.
      const url = urlSpij(fecha);
      const resp = await fetch(url);
      if (!resp.ok) {
        return NextResponse.json(
          {
            ok: false,
            mensaje: `No encontré normas para esa fecha en SPIJ (¿fue domingo o feriado sin edición?). [${resp.status}]`,
          },
          { status: 404 },
        );
      }
      buffer = new Uint8Array(await resp.arrayBuffer());
    } else if (archivo && typeof archivo !== "string") {
      buffer = new Uint8Array(await archivo.arrayBuffer());
    } else {
      return NextResponse.json(
        { ok: false, mensaje: "Elige una fecha o sube un PDF." },
        { status: 400 },
      );
    }

    // 1) Extraer el texto del PDF (gratis, sin IA).
    const pdf = await getDocumentProxy(buffer);
    const { text: textoCrudo } = await extractText(pdf, { mergePages: true });

    // Arreglamos la codificación si vino con acentos rotos (Mac Roman vs 1252).
    const text = arreglarCodificacion(textoCrudo);

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No se pudo leer texto del PDF. ¿Es un PDF escaneado (imagen)? Esos aún no se pueden procesar.",
        },
        { status: 422 },
      );
    }

    // 2) Cortar en normas y quedarnos con las relevantes (gratis).
    const todas = extraerNormas(text);
    const relevantes = todas.filter(esRelevante).map((s) => {
      // Detectamos si modifica otra norma (sin IA), aquí mismo.
      const modif = detectarModificatoria(s.texto, s.numero);
      return {
        tipo: s.tipo,
        numero: s.numero,
        sumilla: s.sumilla,
        texto: recortar(s.texto),
        esModificatoria: modif.esModificatoria,
        modifica: modif.modifica,
      };
    });

    // Cuántas de las relevantes cambian otra ley (para verlo de un vistazo).
    const totalModificatorias = relevantes.filter((n) => n.esModificatoria).length;

    return NextResponse.json({
      ok: true,
      totalDetectadas: todas.length,
      totalRelevantes: relevantes.length,
      totalModificatorias,
      normas: relevantes,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, mensaje: "No se pudo procesar el PDF.", detalle: String(error) },
      { status: 500 },
    );
  }
}
