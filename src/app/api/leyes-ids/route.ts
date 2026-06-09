// Devuelve los IDs de las leyes ya guardadas en Firebase, para que el explicador
// por lotes sepa cuáles saltar y no gastar tokens de IA de más.
// GET /api/leyes-ids

import { NextResponse } from "next/server";
import { listarLeyes } from "@/lib/leyes";

export async function GET() {
  try {
    const leyes = await listarLeyes();
    // "completos" = los que ya tienen el campo "a quién beneficia" lleno. El
    // explicador usa esta lista para saltar solo los que YA están completos, así
    // rellena solo el campo nuevo en los que les falta (sin rehacer todo).
    const completos = leyes
      .filter((l) => l.aQuienBeneficia && l.aQuienBeneficia.trim())
      .map((l) => l.id);
    return NextResponse.json({ ok: true, ids: leyes.map((l) => l.id), completos });
  } catch (error) {
    return NextResponse.json(
      { ok: false, ids: [], detalle: String(error) },
      { status: 500 },
    );
  }
}
