import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Wallet,
  Users,
  Eye,
  Bell,
  House,
  MagnifyingGlass,
  CalendarBlank,
  FileText,
  Megaphone,
  PencilSimple,
} from "@phosphor-icons/react/dist/ssr";
import { RocotoLogo } from "@/components/RocotoLogo";
import { CompartirLey } from "@/components/CompartirLey";
import {
  ModificaChip,
  NaturalezaChip,
  SemaforoBolsillo,
  TemaChip,
} from "@/components/LeyEtiquetas";
import { obtenerLey } from "@/lib/leyes";
import type { ImpactoBolsillo } from "@/lib/groq";

// Convierte un título OFICIAL EN MAYÚSCULAS a algo legible (tipo Stitch),
// conservando siglas cortas (IGV, MTC, N°...) para no romperlas.
function aLegible(t: string): string {
  const partes = t.split(/(\s+)/).map((w) => {
    const esSigla = /[A-ZÁÉÍÓÚÑ]/.test(w) && /^[A-ZÁÉÍÓÚÑ0-9°º.\-()/]{2,5}$/.test(w);
    return esSigla ? w : w.toLowerCase();
  });
  const s = partes.join("");
  return s.replace(/^(\s*)([a-záéíóúñ])/, (_, sp, c) => sp + c.toUpperCase());
}

// Parte un texto en frases, para mostrarlas como puntos numerados (estilo Stitch).
function aPuntos(t?: string): string[] {
  if (!t) return [];
  return t
    .split(/(?<=[.;])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
}

export default async function PaginaLey({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ley = await obtenerLey(id);
  if (!ley) notFound();

  const puntos = aPuntos(ley.queDice);

  return (
    <div className="flex flex-col min-h-full">
      {/* Encabezado */}
      <header className="sticky top-0 z-10 bg-fondo/90 backdrop-blur border-b border-black/5">
        <div className="mx-auto max-w-[1600px] px-5 py-3 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 text-rocoto">
            <RocotoLogo className="w-8 h-8" />
            <span className="font-display font-extrabold text-rocoto">
              Rocoto Ciudadano
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] px-5 py-8 pb-28 flex-1">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-tinta-suave hover:text-rocoto transition"
        >
          <ArrowLeft className="w-4 h-4" weight="bold" /> Volver a las leyes
        </Link>

        {/* Cabecera */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-rocoto text-white text-xs font-bold tracking-wide px-3 py-1">
            {ley.esModificatoria && <PencilSimple className="w-3.5 h-3.5" weight="bold" />}
            {ley.esModificatoria ? "MODIFICACIÓN LEGAL" : "ACTUALIZACIÓN LEGAL"}
          </span>
          <span className="rounded-md bg-black/5 text-tinta text-xs font-bold px-2.5 py-1">
            N° {ley.numero}
          </span>
          {ley.fechaPublicacion && (
            <span className="inline-flex items-center gap-1 text-xs text-tallo font-semibold">
              <CalendarBlank className="w-3.5 h-3.5" weight="fill" /> Publicado: {ley.fechaPublicacion}
            </span>
          )}
        </div>
        <h1 className="mt-2 font-display font-extrabold text-2xl sm:text-[28px] text-tinta leading-tight">
          {aLegible(ley.titulo)}
        </h1>

        {/* Orientadores */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <SemaforoBolsillo impacto={ley.impactoBolsillo} />
          <TemaChip tema={ley.tema} />
          <NaturalezaChip naturaleza={ley.naturaleza} />
          <ModificaChip esModificatoria={ley.esModificatoria} />
        </div>

        {ley.naturaleza === "intencion" && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3">
            <Megaphone className="w-4 h-4 mt-0.5 shrink-0" weight="fill" />
            <span>
              <b>Ojo:</b> esta ley solo <b>declara una intención o prioridad</b>. No
              garantiza por sí sola que la obra se ejecute ni le asigna presupuesto.
            </span>
          </p>
        )}

        {ley.esModificatoria && ley.modifica && ley.modifica.length > 0 && (
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="flex items-center gap-1.5 text-sm font-bold text-amber-800">
              <PencilSimple className="w-4 h-4" weight="bold" /> Esta ley cambia otras normas:
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ley.modifica.map((m) => (
                <span
                  key={m}
                  className="rounded-md bg-white border border-amber-200 text-amber-800 text-xs font-semibold px-2 py-0.5"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* === Compartir el hecho (difusión social, regla de oro) === */}
        <div className="mt-5 rounded-lg border border-black/10 bg-white p-4">
          <CompartirLey titulo={aLegible(ley.titulo)} numero={ley.numero} />
        </div>

        {/* === Qué dice (numerado) + panel del dinero, en columnas parejas === */}
        <div className="mt-6 grid gap-5 lg:grid-cols-2 items-stretch">
          <section className="rounded-lg bg-white border border-black/10 p-6">
            <h2 className="font-display font-bold text-rocoto-dark flex items-center gap-2 text-lg">
              <BookOpen className="w-6 h-6" weight="duotone" /> ¿Qué dice?
            </h2>
            {puntos.length > 1 ? (
              <ol className="mt-4 space-y-3">
                {puntos.map((p, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-rocoto text-white text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-tinta leading-relaxed">{p}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-tinta leading-relaxed">
                {ley.queDice ?? "Aún no traducido."}
              </p>
            )}
          </section>

          <PanelBolsillo impacto={ley.impactoBolsillo} texto={ley.cuantoCuesta} />
        </div>

        {/* === A quién afecta === */}
        <section className="mt-5 rounded-lg bg-white border border-black/10 p-6">
          <h2 className="font-display font-bold text-tallo flex items-center gap-2 text-lg">
            <Users className="w-6 h-6" weight="duotone" /> ¿A quién afecta?
          </h2>
          <p className="mt-2 text-tinta leading-relaxed">
            {ley.aQuienAfecta ?? "Aún no traducido."}
          </p>
        </section>

        {/* === A quién beneficia (el alma) === */}
        {ley.aQuienBeneficia && (
          <section className="mt-5 rounded-lg border-2 border-rocoto/40 bg-rocoto-soft p-6">
            <h2 className="font-display font-bold text-rocoto-dark text-lg flex items-center gap-2">
              <Eye className="w-6 h-6" weight="duotone" /> ¿Y a quién beneficia?
            </h2>
            <p className="mt-2 text-tinta leading-relaxed">{ley.aQuienBeneficia}</p>
            <p className="mt-4 text-xs text-tinta-suave border-t border-rocoto/15 pt-3">
              Te mostramos el hecho. La conclusión la sacas tú. 🌶️
            </p>
          </section>
        )}

        {ley.urlFuente && (
          <a
            href={ley.urlFuente}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-tallo/30 bg-tallo-soft text-tallo font-semibold px-4 py-2 text-sm hover:bg-tallo hover:text-white transition"
          >
            <FileText className="w-4 h-4" weight="bold" /> Ver la norma oficial
            {ley.fuente ? ` en ${ley.fuente}` : ""}
          </a>
        )}

        {ley.textoOriginal && (
          <details className="mt-6 rounded-lg border border-black/5 bg-white p-5">
            <summary className="cursor-pointer font-display font-bold text-tinta">
              Ver el texto legal original
            </summary>
            <p className="mt-3 text-sm text-tinta-suave whitespace-pre-line">
              {ley.textoOriginal}
            </p>
          </details>
        )}
      </main>

      {/* Barra inferior tipo app (como el Stitch) */}
      <nav className="fixed bottom-0 inset-x-0 z-20 bg-white border-t border-black/10">
        <div className="mx-auto max-w-[1600px] px-5 py-2 grid grid-cols-3 items-center text-center">
          <Link
            href="/"
            className="flex flex-col items-center text-tinta-suave hover:text-rocoto text-xs font-semibold"
          >
            <House className="w-6 h-6" weight="duotone" />
            Inicio
          </Link>
          <Link
            href="/"
            className="justify-self-center -mt-6 w-14 h-14 rounded-full bg-rocoto text-white flex flex-col items-center justify-center text-[10px] font-bold shadow-lg hover:bg-rocoto-dark transition"
          >
            <MagnifyingGlass className="w-6 h-6" weight="bold" />
            Buscar
          </Link>
          <Link
            href="/modificadas"
            className="flex flex-col items-center text-tinta-suave hover:text-rocoto text-xs font-semibold"
          >
            <Bell className="w-6 h-6" weight="duotone" />
            Alertas
          </Link>
        </div>
      </nav>
    </div>
  );
}

// Panel destacado del dinero. El color refleja el semáforo (rojo = te cuesta,
// verde = te beneficia, oscuro = neutro), con fuerza visual tipo Stitch.
function PanelBolsillo({
  impacto,
  texto,
}: {
  impacto?: ImpactoBolsillo;
  texto?: string;
}) {
  const fondo =
    impacto === "beneficia" ? "bg-tallo" : impacto === "neutro" ? "bg-tinta" : "bg-rocoto";
  const subtitulo =
    impacto === "beneficia"
      ? "TE BENEFICIA EN EL BOLSILLO"
      : impacto === "neutro"
        ? "SIN EFECTO DIRECTO EN TU BOLSILLO"
        : "SALE DE LOS IMPUESTOS DE TODOS";

  return (
    <section className={`rounded-lg ${fondo} text-white p-6 flex flex-col`}>
      <h2 className="font-display font-bold text-lg flex items-center gap-2">
        <Wallet className="w-6 h-6" weight="duotone" /> ¿Cuánto sale de tu bolsillo?
      </h2>
      {/* El texto se centra en el espacio disponible: reparte el aire arriba y
          abajo en vez de dejar un hueco feo en un solo lado. */}
      <div className="flex-1 flex items-center">
        <p className="leading-relaxed text-white/95 text-[15px] py-3">
          {texto ?? "Aún no traducido."}
        </p>
      </div>
      <p className="text-[11px] font-bold tracking-wider text-white/80 border-t border-white/25 pt-3">
        {subtitulo}
      </p>
    </section>
  );
}
