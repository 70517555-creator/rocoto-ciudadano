// Actualizador diario (gratis, SIN IA). Escanea las ediciones NUEVAS desde la
// última fecha que ya tenemos hasta hoy, detecta modificatorias (Ley / Decreto
// Legislativo / Decreto de Urgencia) que aún no estén registradas, las agrega al
// archivo de datos y reporta qué salió nuevo. Es el "vigilante" del día a día.
//
// Uso:  node scripts/actualizar.mjs            (desde la última fecha → hoy)
//       node scripts/actualizar.mjs 2026-06-06 2026-06-08   (rango manual)

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const ARCHIVO = path.join(process.cwd(), "data", "leyes-modificatorias_2026-01-01_a_2026-06-07.json");
const TIPOS = new Set(["Ley", "Decreto Legislativo", "Decreto De Urgencia"]);

const datos = JSON.parse(readFileSync(ARCHIVO, "utf8"));
const yaTengo = new Set(datos.map((d) => `${d.tipo}|${d.numero}`));
const ultima = datos.map((d) => d.fecha).sort().at(-1);

// Día siguiente a la última fecha registrada.
function masUnDia(f) {
  const [y, m, d] = f.split("-").map(Number);
  const nd = new Date(Date.UTC(y, m - 1, d + 1));
  return nd.toISOString().slice(0, 10);
}
const hoy = new Date().toISOString().slice(0, 10);
const desde = process.argv[2] || masUnDia(ultima);
const hasta = process.argv[3] || hoy;

function* dias(desde, hasta) {
  let [y, m, d] = desde.split("-").map(Number);
  let n = 0;
  while (n++ < 60) {
    const f = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (f > hasta) break;
    yield f;
    const nd = new Date(Date.UTC(y, m - 1, d + 1));
    y = nd.getUTCFullYear(); m = nd.getUTCMonth() + 1; d = nd.getUTCDate();
  }
}
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

console.log(`Buscando novedades de ${desde} a ${hasta} (última que teníamos: ${ultima})...\n`);

const nuevas = [];
for (const fecha of dias(desde, hasta)) {
  const form = new FormData();
  form.append("fecha", fecha);
  try {
    const resp = await fetch(`${BASE}/api/escanear-leyes`, { method: "POST", body: form });
    if (resp.status === 404) { console.log(`  ${fecha}: sin edición`); }
    else if (!resp.ok) { console.log(`  ${fecha}: error HTTP ${resp.status}`); }
    else {
      const j = await resp.json();
      const mod = j.leyes.filter((l) => l.esModificatoria && TIPOS.has(l.tipo));
      let nuevasHoy = 0;
      for (const l of mod) {
        const clave = `${l.tipo}|${l.numero}`;
        if (!yaTengo.has(clave)) {
          yaTengo.add(clave);
          nuevas.push({ fecha, tipo: l.tipo, numero: l.numero, titulo: l.titulo, modifica: l.modifica });
          nuevasHoy++;
        }
      }
      console.log(`  ${fecha}: ${j.total} normas, ${mod.length} modificatorias (${nuevasHoy} nuevas)`);
    }
  } catch (e) {
    console.log(`  ${fecha}: fallo (${e.message})`);
  }
  await esperar(250);
}

console.log(`\n=== ${nuevas.length} MODIFICATORIAS NUEVAS ===\n`);
for (const n of nuevas) {
  console.log(`${n.fecha}  ${n.tipo} N° ${n.numero}`);
  console.log(`   ${n.titulo}`);
  console.log(`   ✏️ modifica: ${n.modifica.join(", ") || "(referencia general)"}\n`);
}

if (nuevas.length) {
  const actualizado = [...datos, ...nuevas].sort((a, b) => a.fecha.localeCompare(b.fecha));
  writeFileSync(ARCHIVO, JSON.stringify(actualizado, null, 2), "utf8");
  console.log(`Guardadas en el archivo de datos (total ahora: ${actualizado.length}).`);
  console.log(`Para explicarlas en la app: usar /api/explicar-modificatoria con su fecha y número.`);
} else {
  console.log("No hay nada nuevo. Todo al día. 🌶️");
}
