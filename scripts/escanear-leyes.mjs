// Escáner LIMPIO de leyes/decretos modificatorios en un rango (gratis, SIN IA).
// Usa /api/escanear-leyes (extractor robusto: número real + título oficial).
// Junta solo las MODIFICATORIAS de tipo Ley / Decreto Legislativo / Decreto de
// Urgencia (el objetivo político), deduplica por número (primera fecha = promulgación)
// y guarda una lista limpia y nombrada.
//
// Uso:  node scripts/escanear-leyes.mjs 2026-01-01 2026-06-07

import { writeFileSync, mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const desde = process.argv[2] || "2026-01-01";
const hasta = process.argv[3] || new Date().toISOString().slice(0, 10);

// Tipos que cuentan para la misión (rango de ley; los Decretos Supremos son
// administrativos y meten mucho ruido, se excluyen aquí).
const TIPOS_OBJETIVO = new Set(["Ley", "Decreto Legislativo", "Decreto De Urgencia"]);

function* dias(desde, hasta) {
  let [y, m, d] = desde.split("-").map(Number);
  let n = 0;
  while (n++ < 500) {
    const f = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    yield f;
    if (f === hasta) break;
    const nd = new Date(Date.UTC(y, m - 1, d + 1));
    y = nd.getUTCFullYear();
    m = nd.getUTCMonth() + 1;
    d = nd.getUTCDate();
  }
}
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const porNumero = new Map(); // numero -> {fecha, tipo, numero, titulo, modifica}
let ediciones = 0;

console.log(`Escaneando leyes/decretos de ${desde} a ${hasta} (sin IA)...\n`);

for (const fecha of dias(desde, hasta)) {
  const form = new FormData();
  form.append("fecha", fecha);
  try {
    const resp = await fetch(`${BASE}/api/escanear-leyes`, { method: "POST", body: form });
    if (resp.status === 404) {
      process.stdout.write("·");
    } else if (!resp.ok) {
      process.stdout.write("x");
    } else {
      const j = await resp.json();
      ediciones++;
      for (const l of j.leyes) {
        if (!l.esModificatoria) continue;
        if (!TIPOS_OBJETIVO.has(l.tipo)) continue;
        // Primera aparición = fecha de promulgación. No sobreescribimos.
        if (!porNumero.has(l.numero)) {
          porNumero.set(l.numero, { fecha, ...l });
        }
      }
      process.stdout.write("✓");
    }
  } catch {
    process.stdout.write("!");
  }
  await esperar(250);
}

const resultados = [...porNumero.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));

console.log("\n\n=== LEYES / DECRETOS MODIFICATORIOS (únicos) ===\n");
for (const r of resultados) {
  console.log(`${r.fecha}  ${r.tipo} N° ${r.numero}`);
  console.log(`   ${r.titulo || "(sin título)"}`);
  console.log(`   ✏️ modifica: ${r.modifica.join(", ")}`);
  console.log();
}

const porTipo = {};
for (const r of resultados) porTipo[r.tipo] = (porTipo[r.tipo] || 0) + 1;
console.log("=== RESUMEN ===");
console.log(`Ediciones: ${ediciones} | Modificatorias únicas: ${resultados.length}`);
console.log("Por tipo:", JSON.stringify(porTipo));

mkdirSync("data", { recursive: true });
const salida = `data/leyes-modificatorias_${desde}_a_${hasta}.json`;
writeFileSync(salida, JSON.stringify(resultados, null, 2), "utf8");
console.log(`\nGuardado en: ${salida}`);
