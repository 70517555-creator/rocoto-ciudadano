// Explica por lotes las modificatorias detectadas: las traduce a las 3 respuestas
// y las guarda (vía /api/explicar-modificatoria). Salta las ya guardadas y se
// DETIENE solo si Groq se satura — así es resumible (retoma cuando haya cupo).
//
// Uso:  node scripts/explicar-todas.mjs            (todas las pendientes)
//       node scripts/explicar-todas.mjs Ley        (solo las de tipo "Ley")

import { readFileSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const args = process.argv.slice(2);
const rehacer = args.includes("--rehacer"); // re-explica TODO (para refrescar con campos nuevos)
const filtroTipo = args.find((a) => !a.startsWith("--")); // opcional: "Ley", "Decreto Legislativo"...
const ARCHIVO = path.join(process.cwd(), "data", "leyes-modificatorias_2026-01-01_a_2026-06-07.json");

const datos = JSON.parse(readFileSync(ARCHIVO, "utf8"));

// IDs que ya están COMPLETOS (con "a quién beneficia"), para saltarlos. Los que
// están a medias (les falta ese campo) se vuelven a explicar para completarlos.
let yaHechos = new Set();
try {
  const r = await fetch(`${BASE}/api/leyes-ids`);
  const j = await r.json();
  yaHechos = new Set(j.completos ?? j.ids ?? []);
} catch {
  console.log("Aviso: no pude leer las ya guardadas; sigo igual.");
}

let pendientes = rehacer ? [...datos] : datos.filter((d) => !yaHechos.has(d.numero));
if (filtroTipo) pendientes = pendientes.filter((d) => d.tipo === filtroTipo);

console.log(`Total: ${datos.length} | Ya explicadas: ${yaHechos.size} | Pendientes a explicar: ${pendientes.length}\n`);

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, fallos = 0;

for (const d of pendientes) {
  process.stdout.write(`[${d.fecha} ${d.tipo} N° ${d.numero}] `);
  try {
    const resp = await fetch(`${BASE}/api/explicar-modificatoria`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fecha: d.fecha, numero: d.numero }),
    });
    const j = await resp.json();
    if (j.ok) {
      ok++;
      console.log("✅");
    } else {
      fallos++;
      const msg = (j.mensaje || "") + (j.detalle || "");
      console.log("⚠️ " + msg.slice(0, 80));
      // Si Groq está saturado (cupo diario), paramos: se retoma luego.
      if (/saturad|rate|quota|429/i.test(msg)) {
        console.log("\n⛔ Groq se saturó. Paro aquí; mañana (o al reanudar) sigue desde donde quedó.");
        break;
      }
    }
  } catch (e) {
    fallos++;
    console.log("✖ " + e.message);
  }
  await esperar(10000); // pausa para respetar el límite por minuto de Groq
}

console.log(`\n=== Explicadas ahora: ${ok} | Con problema: ${fallos} ===`);
console.log("Míralas en /modificadas 🌶️");
