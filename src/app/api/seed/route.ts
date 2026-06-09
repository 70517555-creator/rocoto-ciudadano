// Página de siembra: al visitar /api/seed, borra la ley de prueba y carga
// 3 leyes de ejemplo (con sus 3 respuestas escritas a mano) para ver la web con datos reales.
// Esto es solo para desarrollo; luego las leyes vendrán de Grok + scraping.

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";

const ejemplos = [
  {
    numero: "31572",
    titulo: "Ley del Teletrabajo",
    fechaPublicacion: "11 de septiembre de 2022",
    fuente: "Diario Oficial El Peruano",
    urlFuente: "https://www.gob.pe/institucion/mtpe/normas-legales",
    queDice:
      "Pone reglas claras para trabajar desde casa. Tu empleador debe pagarte la luz e internet que uses para el trabajo, y tú tienes derecho a desconectarte cuando termina tu horario: no te pueden exigir responder fuera de hora.",
    aQuienAfecta:
      "A todas las personas que trabajan desde casa y a sus empleadores, tanto en empresas privadas como en entidades del Estado.",
    cuantoCuesta:
      "A ti no te cuesta nada: la empresa asume el costo de tu internet y electricidad de trabajo. Si ya haces teletrabajo, podrías reclamar esa compensación.",
    textoOriginal:
      "Texto legal original de la Ley N° 31572. (Aquí irá la norma completa tal como se publicó.)",
  },
  {
    numero: "31814",
    titulo:
      "Ley que promueve el uso de la Inteligencia Artificial en favor del desarrollo del país",
    fechaPublicacion: "5 de julio de 2023",
    fuente: "Diario Oficial El Peruano",
    urlFuente: "https://www.gob.pe/institucion/pcm/normas-legales",
    queDice:
      "El Estado se compromete a impulsar el uso responsable de la inteligencia artificial para mejorar la salud, la educación y los servicios públicos, cuidando siempre tus datos personales.",
    aQuienAfecta:
      "A todos los ciudadanos que usan servicios del Estado, y a las empresas y universidades que desarrollan tecnología en el país.",
    cuantoCuesta:
      "No sale de tu bolsillo de forma directa: es una política del Estado y el gasto lo cubre el presupuesto público.",
    textoOriginal:
      "Texto legal original de la Ley N° 31814. (Aquí irá la norma completa tal como se publicó.)",
  },
  {
    numero: "31601",
    titulo:
      "Ley de seguridad y salud en el trabajo de los trabajadores del hogar",
    fechaPublicacion: "20 de octubre de 2022",
    fuente: "Diario Oficial El Peruano",
    urlFuente: "https://www.gob.pe/institucion/mtpe/normas-legales",
    queDice:
      "Reconoce que las trabajadoras y trabajadores del hogar tienen derecho a condiciones seguras: contrato, seguro de salud, vacaciones pagadas y un trato digno.",
    aQuienAfecta:
      "A las personas que trabajan en casas ajenas (limpieza, cocina, cuidado) y a las familias que las contratan.",
    cuantoCuesta:
      "Para la trabajadora no tiene costo; gana derechos. Para quien contrata, implica pagar el seguro y los beneficios de ley.",
    textoOriginal:
      "Texto legal original de la Ley N° 31601. (Aquí irá la norma completa tal como se publicó.)",
  },
];

export async function GET() {
  try {
    // Borramos la ley de prueba si quedó de antes.
    await db.collection("leyes").doc("ejemplo").delete().catch(() => {});

    // Guardamos cada ley usando su número como identificador.
    const ahora = Date.now();
    let i = 0;
    for (const ley of ejemplos) {
      await db
        .collection("leyes")
        .doc(ley.numero)
        .set({
          ...ley,
          // creadoEn distinto para que se ordenen de forma estable
          creadoEn: new Date(ahora - i * 1000).toISOString(),
        });
      i++;
    }

    return NextResponse.json({
      ok: true,
      mensaje: `Se cargaron ${ejemplos.length} leyes de ejemplo. 🌶️`,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, detalle: String(error) },
      { status: 500 },
    );
  }
}
