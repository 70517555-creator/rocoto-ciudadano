// Conexión a Firebase (lado servidor).
// Abre Firestore con la mejor credencial disponible según dónde corra:
//  1) En producción (Firebase / Google Cloud): credenciales del entorno (ADC) — sin archivo.
//  2) Por variable de entorno FIREBASE_SERVICE_ACCOUNT (JSON) — útil en otros hostings.
//  3) En tu compu (desarrollo): el archivo firebase-service-account.json.
// Esto SOLO corre en el servidor, nunca en el navegador: los secretos quedan a salvo.

import {
  cert,
  applicationDefault,
  getApps,
  initializeApp,
  type AppOptions,
  type ServiceAccount,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import path from "node:path";

const PROJECT_ID =
  process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT ?? "ley-clara";

function opcionesDeApp(): AppOptions {
  // 2) Variable de entorno con el JSON completo de la llave.
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (json) {
    return { credential: cert(JSON.parse(json) as ServiceAccount), projectId: PROJECT_ID };
  }

  // 3) Archivo local (solo desarrollo). Si no existe, caemos a (1).
  try {
    const ruta = path.join(process.cwd(), "firebase-service-account.json");
    const contenido = readFileSync(ruta, "utf8");
    return {
      credential: cert(JSON.parse(contenido) as ServiceAccount),
      projectId: PROJECT_ID,
    };
  } catch {
    // 1) Producción en Firebase/Google Cloud: credenciales automáticas del entorno.
    return { credential: applicationDefault(), projectId: PROJECT_ID };
  }
}

// Evita volver a conectar en cada recarga (Next.js recarga mucho en desarrollo).
const app = getApps().length ? getApps()[0] : initializeApp(opcionesDeApp());

// "db" es nuestra puerta a la base de datos. La usaremos para guardar y leer leyes.
export const db = getFirestore(app);
