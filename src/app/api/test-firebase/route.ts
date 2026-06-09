// Página de prueba para confirmar que Firebase está bien conectado.
// Al visitar /api/test-firebase, guarda una ley de ejemplo y la vuelve a leer.
// Si ves "ok: true", ¡la base de datos funciona!

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";

export async function GET() {
  try {
    // Guardamos una ley de ejemplo en la colección "leyes".
    const ref = db.collection("leyes").doc("ejemplo");
    await ref.set({
      numero: "00000",
      titulo: "Ley de ejemplo (prueba de conexión)",
      textoOriginal: "Texto de prueba para confirmar que Firebase guarda datos.",
      textoCiudadano: null,
      creadoEn: new Date().toISOString(),
    });

    // La leemos de vuelta para comprobar que se guardó.
    const snap = await ref.get();

    return NextResponse.json({
      ok: true,
      mensaje: "¡Firebase está conectado y guardando datos! 🎉",
      leyGuardada: snap.data(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        mensaje: "Algo falló al conectar con Firebase.",
        detalle: String(error),
      },
      { status: 500 },
    );
  }
}
