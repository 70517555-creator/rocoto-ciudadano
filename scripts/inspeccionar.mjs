// Inspección del SUMARIO y de los cuerpos sin título.
import { extractText, getDocumentProxy } from "unpdf";
import iconv from "iconv-lite";

const fecha = process.argv[2] || "2026-05-19";
const buscar = process.argv[3]; // número a ubicar en el cuerpo
const [yyyy, mm, dd] = fecha.split("-");
const url = `http://spij.minjus.gob.pe/Normas/textos/${dd}${mm}${yyyy.slice(2)}T.pdf`;

const resp = await fetch(url);
const buffer = new Uint8Array(await resp.arrayBuffer());
const pdf = await getDocumentProxy(buffer);
const { text: crudo } = await extractText(pdf, { mergePages: true });
function senales(s) {
  const e = (s.match(/N[°º]\s*[0-9A-Za-z]/g) ?? []).length;
  const a = (s.match(/[áéíóúñÁÉÍÓÚÑ]/g) ?? []).length;
  return e * 10 + a;
}
const arr = iconv.decode(iconv.encode(crudo, "macintosh"), "win1252");
const texto = senales(arr) > senales(crudo) ? arr : crudo;

console.log("===== PRIMEROS 1800 CHARS (sumario) =====\n");
console.log(texto.slice(0, 1800).replace(/\s+/g, " "));

if (buscar) {
  const idx = texto.indexOf(`Nº ${buscar}`) >= 0 ? texto.indexOf(`Nº ${buscar}`) : texto.indexOf(`N° ${buscar}`);
  console.log(`\n\n===== CUERPO alrededor de ${buscar} (idx ${idx}) =====\n`);
  if (idx >= 0) console.log(texto.slice(idx, idx + 400).replace(/\s+/g, " "));
}
