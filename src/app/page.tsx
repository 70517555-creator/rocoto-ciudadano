import Link from "next/link";
import {
  Gavel,
  Plus,
  ArrowRight,
  Eye,
  MagnifyingGlass,
  BookOpen,
  FileText,
} from "@phosphor-icons/react/dist/ssr";
import { RocotoLogo } from "@/components/RocotoLogo";
import { ListaLeyes } from "@/components/ListaLeyes";
import {
  ModificaChip,
  NaturalezaChip,
  SemaforoBolsillo,
  TemaChip,
} from "@/components/LeyEtiquetas";
import { listarLeyes } from "@/lib/leyes";

// Pasa un título OFICIAL EN MAYÚSCULAS a algo legible, conservando siglas cortas.
function aLegible(t: string): string {
  const partes = t.split(/(\s+)/).map((w) => {
    const esSigla = /[A-ZÁÉÍÓÚÑ]/.test(w) && /^[A-ZÁÉÍÓÚÑ0-9°º.\-()/]{2,5}$/.test(w);
    return esSigla ? w : w.toLowerCase();
  });
  return partes.join("").replace(/^(\s*)([a-záéíóúñ])/, (_, sp, c) => sp + c.toUpperCase());
}

// Siempre leer lo último de Firestore (las leyes se actualizan a diario).
export const dynamic = "force-dynamic";

export default async function Inicio() {
  const leyes = await listarLeyes();
  const destacada = leyes[0]; // la más reciente que guardamos
  const modificadas = leyes.filter((l) => l.esModificatoria).length;

  return (
    <div className="flex flex-col min-h-full">
      {/* === Encabezado con navegación === */}
      <header className="sticky top-0 z-10 bg-fondo/90 backdrop-blur border-b border-black/5">
        <div className="mx-auto max-w-[1600px] px-5 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <RocotoLogo className="w-9 h-9" />
            <span className="font-display font-extrabold text-lg text-rocoto">
              Rocoto Ciudadano
            </span>
          </Link>
          <nav className="ml-auto flex items-center gap-5 text-sm font-bold">
            <Link href="/" className="text-rocoto">
              Inicio
            </Link>
            <a href="#explorar" className="text-tinta-suave hover:text-rocoto transition">
              Buscar
            </a>
            <Link
              href="/modificadas"
              className="text-tinta-suave hover:text-rocoto transition"
            >
              Alertas
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] px-5 pb-24 flex-1">
        {leyes.length === 0 ? (
          <p className="text-tinta-suave text-center py-16">
            Todavía no hay leyes publicadas. ¡Pronto las verás aquí!
          </p>
        ) : (
          <>
            {/* === Hero: ley destacada (se distingue por color y elevación) === */}
            {destacada && (
              <section className="mt-6 mb-6">
                <div className="relative grid items-stretch gap-5 overflow-hidden rounded-2xl border border-rocoto/20 bg-linear-to-br from-rocoto-soft/70 via-white to-white shadow-md ring-1 ring-rocoto/5 md:grid-cols-[1fr_auto]">
                  {/* Franja de acento a la izquierda: marca que es la destacada */}
                  <span className="absolute inset-y-0 left-0 w-1.5 bg-rocoto" />
                  <div className="max-w-2xl p-5 sm:p-7 sm:pl-8">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-rocoto text-white text-[10px] font-bold tracking-wider px-2.5 py-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        LEY DESTACADA · LO MÁS NUEVO
                      </span>
                      <SemaforoBolsillo impacto={destacada.impactoBolsillo} />
                      <TemaChip tema={destacada.tema} />
                      <NaturalezaChip naturaleza={destacada.naturaleza} />
                      <ModificaChip esModificatoria={destacada.esModificatoria} />
                    </div>
                    <h1 className="mt-3 font-display font-extrabold text-2xl sm:text-3xl text-tinta leading-snug line-clamp-2">
                      {aLegible(destacada.titulo)}
                    </h1>
                    {destacada.queDice && (
                      <p className="mt-2 text-sm text-tinta-suave leading-relaxed line-clamp-2">
                        {destacada.queDice}
                      </p>
                    )}
                    <div className="mt-5 flex flex-wrap gap-2.5">
                      <Link
                        href={`/ley/${destacada.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-rocoto text-white text-sm font-bold px-5 py-2.5 shadow-sm hover:bg-rocoto-dark transition"
                      >
                        Leer Traducción
                        <ArrowRight className="w-4 h-4" weight="bold" />
                      </Link>
                      {destacada.urlFuente && (
                        <a
                          href={destacada.urlFuente}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-rocoto/30 bg-white/70 text-rocoto text-sm font-bold px-5 py-2.5 hover:bg-white transition"
                        >
                          Ver PDF Original
                        </a>
                      )}
                    </div>
                  </div>
                  {/* Panel de ícono lleno: ancla visual fuerte a la derecha */}
                  <div className="hidden md:flex w-44 items-center justify-center bg-rocoto text-white">
                    <Gavel className="w-20 h-20" weight="duotone" />
                  </div>
                </div>
              </section>
            )}

            {/* === Banda de misión: la razón de ser del proyecto === */}
            {modificadas > 0 && (
              <section className="mb-12">
                <div className="rounded-2xl border border-rocoto/15 bg-rocoto-soft/50 p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="grid shrink-0 place-items-center w-12 h-12 rounded-xl bg-rocoto text-white">
                      <Eye className="w-7 h-7" weight="duotone" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-rocoto">
                        Transparencia en campaña
                      </p>
                      <h2 className="mt-0.5 font-display font-extrabold text-lg sm:text-xl text-tinta leading-snug">
                        En esta campaña se modificaron {modificadas} leyes. Aquí están
                        los hechos.
                      </h2>
                      <p className="mt-1 text-sm text-tinta-suave">
                        Qué cambió, a quién afecta y a quién beneficia — cada una con su
                        fuente oficial. La conclusión la sacas tú. 🌶️
                      </p>
                    </div>
                    <Link
                      href="/modificadas"
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-rocoto text-white text-sm font-bold px-5 py-3 hover:bg-rocoto-dark transition"
                    >
                      Ver las leyes que cambiaron
                      <ArrowRight className="w-4 h-4" weight="bold" />
                    </Link>
                  </div>
                </div>
              </section>
            )}

            {/* === Explorar leyes (buscador + filtros + cuadrícula) === */}
            <section id="explorar" className="scroll-mt-20">
              <div className="mb-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-rocoto">
                  Explora
                </p>
                <h2 className="mt-0.5 font-display font-bold text-2xl text-tinta">
                  Todas las leyes, día por día
                </h2>
                <p className="mt-1 text-sm text-tinta-suave">
                  {leyes.length} normas traducidas, de la más reciente a la más antigua.
                </p>
              </div>
              <ListaLeyes leyes={leyes} />
            </section>
          </>
        )}

        {/* === Sello de confianza: cómo funciona y por qué creernos === */}
        <section className="mt-16 border-t border-black/5 pt-10">
          <p className="text-center text-[11px] font-bold uppercase tracking-wider text-rocoto">
            Confianza
          </p>
          <h2 className="mt-0.5 text-center font-display font-bold text-2xl text-tinta">
            ¿Cómo funciona Rocoto?
          </h2>
          <p className="mt-2 text-center text-sm text-tinta-suave max-w-2xl mx-auto">
            Sin opiniones ni partidos. Solo los hechos de cada ley, con su fuente
            oficial, para que tú saques tus conclusiones.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <PasoConfianza
              icono={<MagnifyingGlass className="w-7 h-7" weight="duotone" />}
              titulo="1. Vigilamos el diario oficial"
              texto="Cada día revisamos las normas publicadas en el SPIJ (El Peruano), de forma gratuita y automática."
            />
            <PasoConfianza
              icono={<BookOpen className="w-7 h-7" weight="duotone" />}
              titulo="2. Traducimos a lenguaje claro"
              texto="Qué dice, a quién afecta, a quién beneficia y cuánto sale de tu bolsillo — sin enredos legales."
            />
            <PasoConfianza
              icono={<FileText className="w-7 h-7" weight="duotone" />}
              titulo="3. Enlazamos la fuente"
              texto="Cada ley trae su PDF oficial. Mostramos los hechos; la conclusión la sacas tú."
            />
          </div>
        </section>
      </main>

      {/* === Botón flotante del curador (+) === */}
      <Link
        href="/subir"
        title="Agregar / subir una norma"
        className="fixed bottom-6 right-6 z-20 w-14 h-14 rounded-full bg-rocoto text-white flex items-center justify-center shadow-lg hover:bg-rocoto-dark transition"
      >
        <Plus className="w-7 h-7" weight="bold" />
      </Link>

      {/* === Pie === */}
      <footer className="border-t border-black/5 py-6">
        <p className="mx-auto max-w-[1600px] px-5 text-center text-xs text-tinta-suave">
          Gratis siempre · Traducimos, no opinamos · Cada ley enlaza a su fuente
          oficial.
        </p>
      </footer>
    </div>
  );
}

// Tarjeta de un paso del "¿Cómo funciona?" — refuerza la confianza del ciudadano.
function PasoConfianza({
  icono,
  titulo,
  texto,
}: {
  icono: React.ReactNode;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="rounded-xl bg-white border border-black/5 p-5 text-center">
      <div className="mx-auto grid place-items-center w-12 h-12 rounded-xl bg-rocoto-soft text-rocoto">
        {icono}
      </div>
      <h3 className="mt-3 font-display font-bold text-tinta">{titulo}</h3>
      <p className="mt-1 text-sm text-tinta-suave leading-relaxed">{texto}</p>
    </div>
  );
}
