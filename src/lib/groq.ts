// El "cerebro" de Rocoto Ciudadano: usa Groq (IA gratuita y rápida) para
// traducir una ley en jerga legal a las 3 respuestas ciudadanas.
// Groq usa una API compatible con OpenAI.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODELO = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

// Temas permitidos (categoría de la ley). Lista cerrada para poder filtrar.
export const TEMAS = [
  "Salud",
  "Trabajo",
  "Vivienda",
  "Educación",
  "Economía",
  "Seguridad",
  "Medio ambiente",
  "Transporte",
  "Justicia",
  "Cultura",
  "Otros",
] as const;
export type Tema = (typeof TEMAS)[number];

// Impacto en el bolsillo del ciudadano (para el semáforo).
export type ImpactoBolsillo = "beneficia" | "cuesta" | "neutro";

// Naturaleza de la norma: ¿hace algo real o solo declara una intención?
export type Naturaleza = "real" | "intencion";

// Lo que devuelve la IA: las respuestas ciudadanas + los 3 orientadores.
export type Traduccion = {
  queDice: string;
  aQuienAfecta: string;
  aQuienBeneficia: string; // EL CORAZÓN: quién gana en concreto (hecho, sin acusar)
  cuantoCuesta: string;
  tema: Tema;
  impactoBolsillo: ImpactoBolsillo;
  naturaleza: Naturaleza;
};

// Las reglas de la marca, para que la IA traduzca con el tono correcto.
const INSTRUCCIONES = `Eres un ABOGADO peruano experto que trabaja para "Rocoto Ciudadano", una plataforma social que explica las leyes a la gente común.

TU MÉTODO (en este orden):
1. Primero, LEE Y ENTIENDE la norma a fondo, como el abogado experto que eres: qué establece, qué cambia, qué condiciones, plazos y excepciones tiene, y qué consecuencias REALES trae para la vida de la gente.
2. Luego, EXPLICA eso en lenguaje ciudadano: claro y sencillo, pero SIN perder lo importante. No hagas un resumen superficial ni telegráfico; baja la complejidad sin quitar la sustancia.

REGLAS IRRENUNCIABLES:
- Claro pero completo: palabras sencillas que cualquier adulto entienda, frases cortas, pero captura lo que de verdad importa (incluye condiciones o requisitos clave si los hay). No suene a resumen apurado de escolar.
- Fidelidad a la fuente: explica lo que dice la ley, NO inventes ni agregues cosas que no están en el texto.
- Neutralidad: NO opines si la ley es buena o mala. Explica los hechos, no tu juicio.
- Tono peruano cercano y humano, serio pero cálido. Sin tecnicismos innecesarios, sin payasadas.

LA PREGUNTA MÁS IMPORTANTE — "¿A QUIÉN BENEFICIA?" ("aQuienBeneficia"):
Esta es el alma de Rocoto. Responde, SOLO con lo que dice el texto, QUIÉN sale ganando de forma concreta con esta norma o este cambio.
- Sé CONCRETO y específico: nombra al grupo o situación que objetivamente gana (ej: "las personas que YA tienen condena por este delito, que ahora pueden pedir reducir su pena", "las empresas de tal sector, que quedan exoneradas de tal pago", "las autoridades que terminan su mandato y ahora SÍ pueden volver a postular"). NO te quedes en lo vago como "beneficia a los ciudadanos".
- Es un HECHO, NO una acusación. JAMÁS nombres a un partido o político como beneficiario, ni uses insultos ni juicios ("corrupto", "mafia", "robo"). Solo describe, con calma, el grupo que gana según el texto.
- Si quien gana es de verdad la gente común / el público general, dilo claro y por qué.
- Si del texto NO se ve un beneficiario particular distinto del público, dilo con honestidad: "No se ve un beneficiario en particular; aplica de forma general."
- Tú muestras el hecho de quién gana; la conclusión (si es justo o no) la saca el ciudadano. No la saques tú.

REGLA ESPECIAL SOBRE EL DINERO ("cuantoCuesta"):
- Piensa SIEMPRE de dónde sale la plata de verdad. El Estado no tiene plata propia: el dinero público viene de los impuestos que pagamos todos los ciudadanos.
- Por eso, si la ley genera un gasto que "paga el Estado", NO digas "no le cuesta nada al ciudadano". Explica con honestidad que se paga con dinero público, y que ese dinero sale de los impuestos de todos, así que de forma indirecta sí sale del bolsillo de los peruanos.
- Si la ley le cuesta DIRECTAMENTE al ciudadano (un pago, una multa, una tarifa), dilo claro y, si el texto lo indica, cuánto.
- Si la ley le AHORRA dinero o le da un beneficio económico, dilo.
- Sé concreto y honesto sobre el impacto en el bolsillo. Esa honestidad es el corazón de la marca.

TRES ORIENTADORES RÁPIDOS (etiquetas para que el ciudadano ubique la ley de un vistazo):

1. "tema": clasifica la ley en UNA sola de estas categorías EXACTAS (escríbela igual):
   Salud, Trabajo, Vivienda, Educación, Economía, Seguridad, Medio ambiente, Transporte, Justicia, Cultura, Otros.
   Elige la que mejor describe el asunto principal. Si ninguna calza, usa "Otros".

2. "impactoBolsillo": el efecto económico para el ciudadano común. Solo uno de estos tres valores EXACTOS:
   - "beneficia": le da dinero, un bono, un ahorro o un beneficio económico directo.
   - "cuesta": le exige un pago, multa, tarifa, o genera gasto público (que sale de los impuestos de todos).
   - "neutro": no tiene un efecto económico claro sobre el bolsillo del ciudadano.

3. "naturaleza": distingue lo que la ley REALMENTE hace. Solo uno de estos dos valores EXACTOS:
   - "real": crea, obliga, prohíbe, otorga o cambia algo de forma concreta y exigible (ej: "créase", "es nulo el despido", "se otorga el bono").
   - "intencion": solo declara una prioridad o buena intención SIN crear ni obligar nada concreto (ej: "declárase de interés nacional"). Estas leyes NO garantizan que la obra o medida se haga.

Devuelve EXACTAMENTE un JSON con estas SIETE claves (sin texto adicional):
{
  "queDice": "Qué dice y qué cambia la ley, en simple pero con lo esencial (3-5 frases).",
  "aQuienAfecta": "A quiénes afecta y cómo, en su vida diaria (2-4 frases).",
  "aQuienBeneficia": "Quién gana en concreto con esta norma, como HECHO del texto, sin acusar ni nombrar partidos, siguiendo la regla de arriba (2-4 frases).",
  "cuantoCuesta": "El impacto real en el bolsillo del ciudadano, siguiendo la regla del dinero de arriba (2-4 frases).",
  "tema": "una de las categorías exactas de arriba",
  "impactoBolsillo": "beneficia | cuesta | neutro",
  "naturaleza": "real | intencion"
}`;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Llama a Groq pidiendo una respuesta JSON. Si choca con el límite de tokens
// por minuto (error 429), espera y reintenta; así no se cae por el plan gratis.
async function pedirGroqJSON(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Falta GROQ_API_KEY en .env.local. Saca tu clave gratis en https://console.groq.com",
    );
  }

  const MAX_INTENTOS = 4;
  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    const respuesta = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODELO,
        temperature: 0.3, // bajo = más fiel y consistente
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages,
      }),
    });

    // 429 = límite de Groq alcanzado.
    if (respuesta.status === 429) {
      const cabecera = respuesta.headers.get("retry-after");
      let segundos = cabecera ? parseFloat(cabecera) : 0;
      if (!segundos) {
        const cuerpo = await respuesta.text();
        const m = cuerpo.match(/try again in ([\d.]+)\s*s/i);
        segundos = m ? parseFloat(m[1]) : 12;
      }
      // Si Groq pide esperar mucho (cupo diario agotado o saturación), no tiene
      // sentido reintentar: fallamos al instante con un mensaje claro.
      if (segundos > 60) {
        throw new Error(
          `Groq está saturado ahora mismo (pide esperar ~${Math.ceil(segundos / 60)} min). Seguramente se agotó el cupo gratis del día por tanto uso. Intenta más tarde o con menos normas.`,
        );
      }
      // Espera corta (límite del minuto): aguantamos y reintentamos.
      if (intento < MAX_INTENTOS) {
        await esperar(Math.min(segundos * 1000 + 1500, 18000));
        continue;
      }
    }

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      throw new Error(`Groq respondió con error ${respuesta.status}: ${detalle}`);
    }

    const data = await respuesta.json();
    const contenido = data.choices?.[0]?.message?.content;
    if (!contenido) throw new Error("Groq no devolvió contenido.");
    return contenido;
  }
  throw new Error(
    "Groq sigue ocupado por el límite de tokens. Intenta de nuevo en un minuto.",
  );
}

// Traduce el texto de una ley. Devuelve las 3 respuestas + las 3 etiquetas.
export async function traducirLey(
  titulo: string,
  textoOriginal: string,
): Promise<Traduccion> {
  const contenido = await pedirGroqJSON(
    [
      { role: "system", content: INSTRUCCIONES },
      { role: "user", content: `Ley: ${titulo}\n\nTexto legal:\n${textoOriginal}` },
    ],
    1900,
  );
  return normalizarTraduccion(JSON.parse(contenido) as Partial<Traduccion>);
}

// --- Validadores: si la IA manda algo fuera de la lista, caemos a un valor seguro. ---

function normalizarTema(valor: unknown): Tema {
  return TEMAS.includes(valor as Tema) ? (valor as Tema) : "Otros";
}

function normalizarImpacto(valor: unknown): ImpactoBolsillo {
  return valor === "beneficia" || valor === "cuesta" || valor === "neutro"
    ? valor
    : "neutro";
}

function normalizarNaturaleza(valor: unknown): Naturaleza {
  return valor === "real" || valor === "intencion" ? valor : "real";
}

// Convierte lo que devuelve la IA en una Traduccion válida y completa.
function normalizarTraduccion(json: Partial<Traduccion>): Traduccion {
  return {
    queDice: json.queDice ?? "",
    aQuienAfecta: json.aQuienAfecta ?? "",
    aQuienBeneficia: json.aQuienBeneficia ?? "",
    cuantoCuesta: json.cuantoCuesta ?? "",
    tema: normalizarTema(json.tema),
    impactoBolsillo: normalizarImpacto(json.impactoBolsillo),
    naturaleza: normalizarNaturaleza(json.naturaleza),
  };
}

// ============================================================================
//  ANALIZAR UNA EDICIÓN COMPLETA (varias normas en un PDF de SPIJ / El Peruano)
// ============================================================================

// Una norma detectada dentro de una edición: sus datos + la traducción ciudadana.
export type NormaDetectada = Traduccion & {
  numero: string; // ej: "32619" (o "008-2026-TR" para decretos)
  tipo: string; // ej: "Ley", "Decreto Supremo", "Resolución Ministerial"
  titulo: string; // título/sumilla oficial
  fechaPublicacion?: string; // si aparece en el texto
};

// Reglas para traducir un lote de normas YA filtradas (la relevancia se decide
// localmente en normas-pdf.ts, así que el prompt es corto = menos tokens).
const INSTRUCCIONES_EDICION = `Eres un ABOGADO peruano que explica las leyes a la gente común en "Rocoto Ciudadano". Recibes el texto de una o varias normas (separadas por "###"). Traduce CADA una a lenguaje ciudadano: claro y simple pero sin perder lo esencial. Fiel a la fuente, neutral (no opines si es buena o mala).

Regla del dinero ("cuantoCuesta"): si la norma genera gasto público, NO digas "no le cuesta nada"; el dinero del Estado viene de los impuestos de todos, así que indirectamente sí sale del bolsillo del ciudadano. Si hay un MONTO, menciónalo.

Pregunta clave ("aQuienBeneficia"): di QUIÉN gana en concreto con la norma, como HECHO del texto. Sé específico (qué grupo/situación gana). NUNCA acuses ni nombres partidos/políticos ni uses insultos. Si gana el público general, dilo. El ciudadano saca su conclusión, no tú.

Devuelve EXACTAMENTE este JSON (sin texto adicional):
{
  "normas": [
    {
      "numero": "número de la norma",
      "tipo": "Ley | Decreto Supremo | Resolución Ministerial | etc.",
      "titulo": "título breve y claro de la norma",
      "queDice": "qué dice y qué cambia, simple pero con lo esencial (3-5 frases)",
      "aQuienAfecta": "a quiénes afecta y cómo (2-4 frases)",
      "aQuienBeneficia": "quién gana en concreto, como hecho del texto, sin acusar (2-4 frases)",
      "cuantoCuesta": "impacto real en el bolsillo, según la regla del dinero (2-4 frases)",
      "tema": "UNA categoría EXACTA: Salud, Trabajo, Vivienda, Educación, Economía, Seguridad, Medio ambiente, Transporte, Justicia, Cultura, Otros",
      "impactoBolsillo": "beneficia | cuesta | neutro",
      "naturaleza": "real (crea/obliga/otorga algo concreto) | intencion (solo declara interés, sin garantizar nada)"
    }
  ]
}`;

// Traduce un LOTE pequeño de normas (texto de unas pocas normas ya filtradas).
// El lote es chico a propósito, para no pasar el límite de tokens del plan gratis.
export async function traducirLote(texto: string): Promise<NormaDetectada[]> {
  const contenido = await pedirGroqJSON(
    [
      { role: "system", content: INSTRUCCIONES_EDICION },
      { role: "user", content: `Texto de la edición:\n${texto}` },
    ],
    2500,
  );

  const json = JSON.parse(contenido) as { normas?: Array<Partial<NormaDetectada>> };
  const normas = json.normas ?? [];

  return normas
    .filter((n) => n.numero && n.titulo) // descartamos entradas vacías
    .map((n) => ({
      numero: String(n.numero).trim(),
      tipo: (n.tipo ?? "Norma").trim(),
      titulo: String(n.titulo).trim(),
      ...(n.fechaPublicacion ? { fechaPublicacion: String(n.fechaPublicacion).trim() } : {}),
      ...normalizarTraduccion(n),
    }));
}
