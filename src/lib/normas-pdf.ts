// Corta el texto de una edición en normas individuales y descarta lo irrelevante,
// TODO sin usar IA (gratis). Así reducimos cuánto texto le mandamos a Groq.

import iconv from "iconv-lite";

export type Segmento = {
  tipo: string; // ej: "Ley", "Decreto Supremo", "Resolución Ministerial"
  numero: string; // ej: "32619" o "008-2026-TR"
  sumilla: string; // el titulito que va ANTES del encabezado ("Designan...", "Aprueban...")
  texto: string; // el texto de esa norma
};

// Encabezados con los que empieza cada norma en El Peruano / SPIJ.
const ENCABEZADO =
  /(LEY|DECRETO SUPREMO|DECRETO LEGISLATIVO|DECRETO DE URGENCIA|RESOLUCI[ÓO]N LEGISLATIVA|RESOLUCI[ÓO]N MINISTERIAL|RESOLUCI[ÓO]N SUPREMA|RESOLUCI[ÓO]N VICEMINISTERIAL|RESOLUCI[ÓO]N DIRECTORAL|RESOLUCI[ÓO]N ADMINISTRATIVA|RESOLUCI[ÓO]N JEFATURAL|RESOLUCI[ÓO]N)\s+N[°º]\s*([0-9A-Za-z][A-Za-z0-9\-./]*)/g;

// Arma la URL del PDF oficial de SPIJ para una fecha "YYYY-MM-DD".
// SPIJ sirve cada edición en: http://spij.minjus.gob.pe/Normas/textos/DDMMAAT.pdf
export function urlSpij(fecha: string): string {
  const [yyyy, mm, dd] = fecha.split("-");
  const nombre = `${dd}${mm}${yyyy.slice(2)}T.pdf`;
  return `http://spij.minjus.gob.pe/Normas/textos/${nombre}`;
}

// Cuenta "señales" de texto en buen español (encabezados y acentos correctos).
function contarSenales(s: string): number {
  const encabezados = (s.match(/N[°º]\s*[0-9A-Za-z]/g) ?? []).length;
  const acentos = (s.match(/[áéíóúñÁÉÍÓÚÑ]/g) ?? []).length;
  return encabezados * 10 + acentos;
}

// Algunos PDFs salen en Windows-1252 mal leídos como Mac Roman (acentos rotos:
// "GestiÛn", "N∫"...). Lo revertimos, PERO solo si mejora el texto (para no
// dañar los PDFs que ya vienen bien).
export function arreglarCodificacion(texto: string): string {
  const arreglado = iconv.decode(iconv.encode(texto, "macintosh"), "win1252");
  return contarSenales(arreglado) > contarSenales(texto) ? arreglado : texto;
}

// Pone "Decreto Supremo" en vez de "DECRETO SUPREMO".
function tituloBonito(texto: string): string {
  return texto
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/Ó/g, "ó");
}

// Parte el texto completo en normas, usando los encabezados como puntos de corte.
export function extraerNormas(texto: string): Segmento[] {
  const matches = [...texto.matchAll(ENCABEZADO)];
  if (matches.length === 0) return [];

  const crudos: Segmento[] = matches.map((m, i) => {
    const inicio = m.index ?? 0;
    const fin = i + 1 < matches.length ? (matches[i + 1].index ?? texto.length) : texto.length;
    // La sumilla (acción) va justo ANTES del encabezado. Tomamos un trozo previo.
    const sumilla = texto
      .slice(Math.max(0, inicio - 160), inicio)
      .replace(/\s+/g, " ")
      .trim();
    return {
      tipo: tituloBonito(m[1]),
      numero: m[2].trim(),
      sumilla,
      texto: texto.slice(inicio, fin).trim(),
    };
  });

  // El "sumario" (índice del inicio) repite los números con solo una línea.
  // Nos quedamos, por cada número, con el segmento MÁS LARGO (el cuerpo real).
  const porNumero = new Map<string, Segmento>();
  for (const s of crudos) {
    const previo = porNumero.get(s.numero);
    if (!previo || s.texto.length > previo.texto.length) porNumero.set(s.numero, s);
  }
  return [...porNumero.values()];
}

// ¿Esta norma le importa al ciudadano? (criterio: gasto público o efecto en su vida)
// Es ESTRICTO a propósito: en una edición hay decenas de trámites internos que
// no le interesan a nadie. Mejor mostrar poco y bueno (el curador siempre puede
// subir algo puntual a mano).
export function esRelevante(s: Segmento): boolean {
  const tipo = s.tipo.toLowerCase();

  // Leyes y decretos (supremo/legislativo/urgencia): casi siempre relevantes.
  if (tipo.startsWith("ley") || tipo.startsWith("decreto") || tipo.includes("legislativa")) {
    return true;
  }

  const sumilla = s.sumilla.toLowerCase();

  // Si la SUMILLA es una designación/nombramiento/renuncia → trámite interno, fuera.
  const esDesignacion =
    /\b(design|nombr|encarg|ratific|aceptan? la renuncia|aceptan? renuncia|dan? por conclu|prorrog[a-z]* la design|reconoc[ei]|dejan? sin efecto la design|conclusi[óo]n de la design)/.test(
      sumilla,
    );
  const hayMonto = /(s\/\s?\d|us\$\s?\d)/.test(s.texto);

  if (esDesignacion && !hayMonto) return false;

  // Lo demás (Aprueban, Autorizan, Modifican, Crean, Disponen...) se queda.
  return true;
}

// === Detector de MODIFICATORIAS (sin IA, gratis) ===
// Las normas que cambian otra norma usan verbos fijos del lenguaje legal peruano.
// Detectarlos con patrones nos permite marcar "esta ley modifica a tal otra" y
// cuáles, sin gastar un solo token. Es la base para ver qué se cambió y cuándo.

// Verbos con que una norma ALTERA otra (cada aparición la analizamos por separado).
const VERBO_MODIFICACION =
  /\b(modif[ií]c\w*|der[oó]g\w*|incorp[oó]r\w*|sustit[uú]y\w*|ref[oó]rm\w*)/gi;

// Referencias a otra norma CON número: "Ley N° 30220", "Decreto Legislativo N° 1234".
const REFERENCIA_NORMA =
  /\b(Ley|Decreto Legislativo|Decreto Supremo|Decreto de Urgencia|Decreto Ley|Resoluci[óo]n Legislativa)\s+N[°º]\s*([0-9][0-9.\-]*)/gi;

// Referencias a Códigos (no llevan número): "Código Penal", "Código Civil"...
const REFERENCIA_CODIGO =
  /\bC[óo]digo\s+(Penal|Civil|Procesal Penal|Procesal Civil|Tributario|de Ejecuci[óo]n Penal|de los Ni[ñn]os y Adolescentes|Procesal Constitucional|del Consumidor|de Comercio|Electoral)/gi;

export type DeteccionModif = {
  esModificatoria: boolean; // ¿esta norma cambia otra(s)?
  modifica: string[]; // qué normas cambia, en texto legible (sin contarse a sí misma)
};

// Clave: solo contamos una ley como MODIFICADA si su número está PEGADO al verbo
// ("Modifícase el art. 5 de la Ley N° 30220"), no si aparece suelta en el
// preámbulo como base legal. Eso elimina los falsos positivos.
export function detectarModificatoria(
  texto: string,
  numeroPropio?: string,
): DeteccionModif {
  const refs = new Set<string>();

  for (const v of texto.matchAll(VERBO_MODIFICACION)) {
    const inicio = v.index ?? 0;
    // Ventana corta tras el verbo: la misma oración donde se nombra qué cambia.
    const ventana = texto.slice(inicio, inicio + 160);

    for (const m of ventana.matchAll(REFERENCIA_NORMA)) {
      const numero = m[2].trim();
      if (numeroPropio && numero === numeroPropio.trim()) continue;
      refs.add(`${tituloBonito(m[1])} N° ${numero}`);
    }
    for (const m of ventana.matchAll(REFERENCIA_CODIGO)) {
      refs.add(`Código ${m[1]}`);
    }
  }

  const modifica = [...refs];
  return { esModificatoria: modifica.length > 0, modifica };
}

// === Extractor ROBUSTO de leyes/decretos PROMULGADOS (sin IA) ===
// Para la misión de detectar modificatorias necesitamos el número REAL de la ley
// nueva (no el de la ley que modifica) y su título oficial. La señal confiable:
// un encabezado real va seguido de "EL PRESIDENTE DE LA REPÚBLICA" (la fórmula de
// promulgación). Las menciones embebidas en títulos ("...MODIFICA LA LEY N° X")
// NO llevan esa fórmula, así que quedan descartadas solas.

export type LeyPromulgada = {
  tipo: string; // "Ley" | "Decreto Legislativo" | "Decreto De Urgencia" | "Decreto Supremo"
  numero: string; // número REAL de la norma promulgada
  titulo: string; // título oficial (tal cual la fuente)
  esModificatoria: boolean;
  modifica: string[]; // qué normas cambia
  texto: string; // el cuerpo de la norma (recortado), para traducir con IA
};

const HEADER_PROMULGADA =
  /(LEY|DECRETO LEGISLATIVO|DECRETO DE URGENCIA|DECRETO SUPREMO)\s+N[°º]\s*([0-9][A-Za-z0-9\-./]*)\s*(?:Página\s*\d+\s*)?EL\s+PRESIDENTE\s+DE\s+LA\s+REP/g;

// Corte del título: el "Artículo 1/único" operativo va en Mayúscula-minúscula,
// distinto de "ARTÍCULO" en mayúsculas que es parte del propio título.
// Aceptamos "único"/"Único" (con o sin tilde) porque así aparece en la fuente.
const FIN_TITULO =
  /Art[íi]culo\s+(?:1|[ÚúUu]nico|[Pp]rimero)|DISPOSICI[ÓO]N (?:COMPLEMENTARIA|[Tt]ransitoria)/;

// Caption limpio (en Mayúscula-minúscula) que va JUSTO antes del encabezado formal;
// es el plan B para normas sin título en el cuerpo (típico de Decretos de Urgencia).
const CAPTION = /(Ley|Decreto Legislativo|Decreto de Urgencia|Decreto Supremo)\s+que\s+/g;

export function extraerLeyesPromulgadas(texto: string): LeyPromulgada[] {
  const heads = [...texto.matchAll(HEADER_PROMULGADA)];
  const lista: LeyPromulgada[] = [];

  for (let i = 0; i < heads.length; i++) {
    const h = heads[i];
    const inicio = h.index ?? 0;
    const fin = i + 1 < heads.length ? (heads[i + 1].index ?? texto.length) : texto.length;
    const cuerpo = texto.slice(inicio, fin);
    const tipo = tituloBonito(h[1]);
    const numero = h[2].trim();

    // Título — lo buscamos en orden de fiabilidad:
    let titulo = "";
    // 1) "<TIPO> QUE ..." en el cuerpo (lo más común en modificatorias).
    const porQue = cuerpo.match(
      new RegExp(
        `(LEY|DECRETO LEGISLATIVO|DECRETO DE URGENCIA)\\s+QUE\\s+(.+?)\\s*(?:${FIN_TITULO.source})`,
        "s",
      ),
    );
    if (porQue) {
      titulo = `${porQue[1]} QUE ${porQue[2]}`;
    } else {
      // 2) Tras "Ha dado ... siguiente:".
      const porHaDado = cuerpo.match(
        new RegExp(
          `Ha dado (?:la Ley|el Decreto Legislativo|el Decreto de Urgencia)[^:]*:\\s*(.+?)\\s*(?:${FIN_TITULO.source})`,
          "s",
        ),
      );
      if (porHaDado) titulo = porHaDado[1];
    }
    // 3) Plan B: el caption (Mayúscula-minúscula) justo antes del encabezado.
    if (!titulo) {
      const antes = texto.slice(Math.max(0, inicio - 400), inicio);
      const caps = [...antes.matchAll(CAPTION)];
      if (caps.length) titulo = antes.slice(caps[caps.length - 1].index);
    }
    titulo = titulo.replace(/Página\s*\d+/g, "").replace(/\s+/g, " ").trim();
    if (titulo.length > 220) titulo = titulo.slice(0, 220) + "…";

    const modif = detectarModificatoria(cuerpo, numero);
    lista.push({
      tipo,
      numero,
      titulo,
      esModificatoria: modif.esModificatoria,
      modifica: modif.modifica,
      texto: recortar(cuerpo),
    });
  }

  // Por si un número saliera dos veces, nos quedamos con el de título más largo.
  const porNumero = new Map<string, LeyPromulgada>();
  for (const l of lista) {
    const previo = porNumero.get(l.numero);
    if (!previo || l.titulo.length > previo.titulo.length) porNumero.set(l.numero, l);
  }
  return [...porNumero.values()];
}

// Recorta una norma muy larga para no pasar el límite de tokens al traducir.
export function recortar(texto: string, maxCaracteres = 7000): string {
  return texto.length > maxCaracteres ? texto.slice(0, maxCaracteres) : texto;
}

// Agrupa los segmentos relevantes en LOTES que no superen cierto tamaño,
// para que cada llamada a la IA quepa en el plan gratis.
export function agruparEnLotes(segmentos: Segmento[], maxCaracteres = 11000): string[] {
  const lotes: string[] = [];
  let actual = "";
  for (const s of segmentos) {
    const trozo = `\n\n### ${s.tipo} N° ${s.numero}\n${recortar(s.texto)}`;
    if (actual.length + trozo.length > maxCaracteres && actual) {
      lotes.push(actual);
      actual = "";
    }
    actual += trozo;
  }
  if (actual.trim()) lotes.push(actual);
  return lotes;
}
