// Interpreta TODAS las normas de una fecha (no solo las modificatorias): las baja,
// las traduce a las respuestas con la IA y las guarda. Salta las ya guardadas para
// no gastar cupo de Groq de más, y se DETIENE si Groq se satura (resumible).
//
// Uso:  node scripts/explicar-fecha.mjs 2026-06-05            (todas las pendientes)
//       node scripts/explicar-fecha.mjs 2026-06-05 --max 6    (solo 6, para cuidar el cupo)
//       node scripts/explicar-fecha.mjs 2026-06-05 --rehacer  (re-explica incluso las guardadas)

const BASE = process.env.BASE_URL || "http://localhost:3000";
const args = process.argv.slice(2);
const fecha = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
const rehacer = args.includes("--rehacer");
const maxArg = args[args.indexOf("--max") + 1];
const max = args.includes("--max") ? Number(maxArg) : Infinity;

if (!fecha) {
  console.log("Falta la fecha. Ej: node scripts/explicar-fecha.mjs 2026-06-05");
  process.exit(1);
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// 1) Bajar la lista completa de normas de esa fecha (gratis, sin IA).
const form = new FormData();
form.append("fecha", fecha);
const escan = await fetch(`${BASE}/api/escanear-leyes`, { method: "POST", body: form });
if (!escan.ok) {
  console.log(`No hay edición para ${fecha} (HTTP ${escan.status}).`);
  process.exit(1);
}
const { leyes = [] } = await escan.json();

// 2) Saber cuáles ya están guardadas, para saltarlas (a menos que --rehacer).
let yaHechas = new Set();
if (!rehacer) {
  try {
    const r = await fetch(`${BASE}/api/leyes-ids`);
    const j = await r.json();
    yaHechas = new Set(j.ids ?? []);
  } catch {
    console.log("Aviso: no pude leer las ya guardadas; sigo igual.");
  }
}

let pendientes = leyes.filter((l) => !yaHechas.has(l.numero));
console.log(
  `Edición ${fecha}: ${leyes.length} normas | ya guardadas: ${leyes.length - pendientes.length} | a interpretar: ${Math.min(pendientes.length, max)}\n`,
);

let ok = 0, fallos = 0;
for (const l of pendientes) {
  if (ok >= max) {
    console.log(`\n🛑 Llegué al máximo (${max}) que pediste. El resto queda para después.`);
    break;
  }
  process.stdout.write(`[${l.tipo} N° ${l.numero}] ${(l.titulo || "").slice(0, 55)}… `);
  try {
    const resp = await fetch(`${BASE}/api/explicar-modificatoria`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fecha, numero: l.numero }),
    });
    const j = await resp.json();
    if (j.ok) {
      ok++;
      console.log("✅");
    } else {
      fallos++;
      const msg = (j.mensaje || "") + (j.detalle || "");
      console.log("⚠️ " + msg.slice(0, 80));
      if (/saturad|rate|quota|429/i.test(msg)) {
        console.log("\n⛔ Groq se saturó. Paro aquí; al reanudar sigue desde donde quedó.");
        break;
      }
    }
  } catch (e) {
    fallos++;
    console.log("✖ " + e.message);
  }
  await esperar(10000); // respeta el límite por minuto de Groq
}

console.log(`\n=== Interpretadas ahora: ${ok} | Con problema: ${fallos} ===`);
console.log("Míralas en la portada 🌶️");
