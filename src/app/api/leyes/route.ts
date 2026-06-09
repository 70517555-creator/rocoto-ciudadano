// Recibe una ley pegada por el usuario, la traduce con Groq y la guarda en Firebase.
// POST /api/leyes

import { NextResponse } from "next/server";
import { traducirLey } from "@/lib/groq";
import { guardarLey } from "@/lib/leyes";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const numero = (body.numero ?? "").trim();
    const titulo = (body.titulo ?? "").trim();
    const textoOriginal = (body.textoOriginal ?? "").trim();

    // Validación mínima.
    if (!numero || !titulo || !textoOriginal) {
      return NextResponse.json(
        { ok: false, mensaje: "Faltan datos: número, título y texto son obligatorios." },
        { status: 400 },
      );
    }

    // 1) La IA traduce a las 3 respuestas ciudadanas.
    const traduccion = await traducirLey(titulo, textoOriginal);

    // 2) Guardamos la ley ya traducida (se traduce UNA sola vez).
    const id = await guardarLey(
      {
        numero,
        titulo,
        textoOriginal,
        fechaPublicacion: body.fechaPublicacion?.trim() || undefined,
        fuente: body.fuente?.trim() || undefined,
        urlFuente: body.urlFuente?.trim() || undefined,
      },
      traduccion,
    );

    return NextResponse.json({ ok: true, id, traduccion });
  } catch (error) {
    return NextResponse.json(
      { ok: false, mensaje: "No se pudo procesar la ley.", detalle: String(error) },
      { status: 500 },
    );
  }
}
