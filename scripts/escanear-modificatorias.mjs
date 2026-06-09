// Escáner de MODIFICATORIAS por rango de fechas (gratis, SIN IA).
// Recorre día por día, le pide a /api/procesar-pdf que baje la edición de SPIJ,
// la corte y detecte qué normas cambian otra ley, y junta todo en un JSON.
//
// Uso (con el server corriendo en localhost:3000):
//   node scripts/escanear-modificatorias.mjs 2026-01-01 2026-06-07
//
// Símbolos del progreso:  ✓ edición con normas   · sin edición (domingo/feriado)   x/! error

import { writeFileSync, mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const desde = process.argv[2] || "2026-01-01";
const hasta = process.argv[3] || new Date().toISOString().slice(0, 10);

// Genera fechas "YYYY-MM-DD" de `desde` a `hasta`, usando UTC para no perder días.
function* dias(desde, hasta) {
  let [y, m, d] = desde.split("-").map(Number);
  let cuenta = 0;
  while (cuenta++ < 500) {
    const fecha = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    yield fecha;
    if (fecha === hasta) break;
    const nd = new Date(Date.UTC(y, m - 1, d + 1));
    y = nd.getUTCFullYear();
    m = nd.getUTCMonth() + 1;
    d = nd.getUTCDate();
  }
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const resultados = [];
let edicionesOK = 0,
  sinEdicion = 0,
  errores = 0;

console.log(`Escaneando SPIJ de ${desde} a ${hasta} (sin IA)...\n`);

for (const fecha of dias(desde, hasta)) {
  const form = new FormData();
  form.append("fecha", fecha);
  try {
    const resp = await fetch(`${BASE}/api/procesar-pdf`, {
      method: "POST",
      body: form,
    });
    if (resp.status === 404) {
      sinEdicion++;
      process.stdout.write("·");
    } else if (!resp.ok) {
      errores++;
      process.stdout.write("x");
    } else {
      const j = await resp.json();
      if (!j.ok) {
        errores++;
        process.stdout.write("x");
      } else {
        edicionesOK++;
        for (const n of j.normas) {
          if (n.esModificatoria) {
            resultados.push({
              fecha,
              tipo: n.tipo,
              numero: n.numero,
              sumilla: n.sumilla,
              modifica: n.modifica,
            });
          }
        }
        process.stdout.write("✓");
      }
    }
  } catch {
    errores++;
    process.stdout.write("!");
  }
  await esperar(250); // pausa cortita para no martillar a SPIJ
}

console.log("\n\n=== RESUMEN ===");
console.log(`Rango: ${desde} → ${hasta}`);
console.log(
  `Ediciones con normas: ${edicionesOK} | Sin edición (domingo/feriado): ${sinEdicion} | Errores: ${errores}`,
);
console.log(`Modificatorias encontradas: ${resultados.length}`);

// Desglose por tipo de norma (para decidir luego si filtramos solo Leyes).
const porTipo = {};
for (const r of resultados) porTipo[r.tipo] = (porTipo[r.tipo] || 0) + 1;
console.log("Por tipo:", JSON.stringify(porTipo, null, 2));

// Guardamos la lista completa en un JSON para revisarla.
mkdirSync("data", { recursive: true });
const salida = `data/modificatorias_${desde}_a_${hasta}.json`;
writeFileSync(salida, JSON.stringify(resultados, null, 2), "utf8");
console.log(`\nGuardado en: ${salida}`);
