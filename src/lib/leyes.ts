// Acceso a las leyes guardadas en Firebase.
// Aquí definimos qué es una "Ley" y las funciones para leerlas.
// Esto corre SOLO en el servidor (usa la conexión firebase-admin).

import { db } from "./firebase";
import type { ImpactoBolsillo, Naturaleza, Tema, Traduccion } from "./groq";

// Una ley, tal como la mostramos en Rocoto Ciudadano.
export type Ley = {
  id: string;
  numero: string; // ej: "31572"
  titulo: string; // título oficial
  fechaPublicacion?: string; // ej: "5 de julio de 2023"
  fuente?: string; // ej: "Diario Oficial El Peruano"
  urlFuente?: string; // enlace a la norma original (fidelidad a la fuente)

  // La traducción ciudadana (la llena Groq):
  queDice?: string; // ① qué dice
  aQuienAfecta?: string; // ② a quién afecta
  aQuienBeneficia?: string; // 👁️ a quién beneficia (el hecho, sin acusar)
  cuantoCuesta?: string; // ③ cuánto sale de tu bolsillo

  // Los 3 orientadores rápidos (también los llena Groq):
  tema?: Tema; // categoría: Salud, Trabajo, Vivienda...
  impactoBolsillo?: ImpactoBolsillo; // beneficia | cuesta | neutro (semáforo)
  naturaleza?: Naturaleza; // real | intencion

  // Si esta ley cambia OTRA ley (detectado gratis, sin IA). No cambia la esencia:
  // la ley se sigue mostrando con sus 3 respuestas; esto solo agrega un chip ✏️.
  esModificatoria?: boolean;
  modifica?: string[]; // qué normas cambia (ej: ["Código Penal", "Ley N° 30096"])

  textoOriginal?: string; // el texto legal completo
  creadoEn?: string; // cuándo lo guardamos (para ordenar)
};

// Trae todas las leyes, de la más reciente a la más antigua.
export async function listarLeyes(): Promise<Ley[]> {
  const snap = await db.collection("leyes").orderBy("creadoEn", "desc").get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Ley, "id">),
  }));
}

// Trae una sola ley por su identificador.
export async function obtenerLey(id: string): Promise<Ley | null> {
  const doc = await db.collection("leyes").doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as Omit<Ley, "id">) };
}

// Datos que se necesitan para crear una ley (antes de traducir).
export type NuevaLey = {
  numero: string;
  titulo: string;
  textoOriginal?: string; // opcional: el cargador de PDF no siempre lo tiene limpio
  fechaPublicacion?: string;
  fuente?: string;
  urlFuente?: string;
  esModificatoria?: boolean; // si cambia otra ley (detectado sin IA)
  modifica?: string[]; // qué normas cambia
};

// Guarda una ley ya traducida. Usa el número de ley como identificador.
export async function guardarLey(
  datos: NuevaLey,
  traduccion: Traduccion,
): Promise<string> {
  // El ID no puede tener "/" ni "\" (Firestore los usa como separadores de ruta).
  // Limpiamos para el ID, pero el número original se guarda intacto en el dato.
  const id = datos.numero.trim().replace(/[/\\]/g, "-");

  // Armamos el documento y quitamos los campos vacíos (Firestore no acepta "undefined").
  const documento: Record<string, unknown> = {
    ...datos,
    ...traduccion,
    creadoEn: new Date().toISOString(),
  };
  for (const clave of Object.keys(documento)) {
    if (documento[clave] === undefined) delete documento[clave];
  }

  await db.collection("leyes").doc(id).set(documento);
  return id;
}
