import Link from "next/link";
import { RocotoLogo } from "@/components/RocotoLogo";
import { ListaLeyes } from "@/components/ListaLeyes";
import { listarLeyes } from "@/lib/leyes";

export const metadata = {
  title: "Últimas leyes modificadas — Rocoto Ciudadano",
  description:
    "Las leyes que cambiaron otras leyes, explicadas en claro: qué dice, a quién afecta y cuánto sale de tu bolsillo.",
};

// Siempre leer lo último de Firestore (las leyes se actualizan a diario).
export const dynamic = "force-dynamic";

// Misma esencia que la portada: tarjetas cálidas con las 3 respuestas.
// Aquí solo mostramos las leyes marcadas como modificatorias.
export default async function Modificadas() {
  const todas = await listarLeyes();
  const leyes = todas.filter((l) => l.esModificatoria);

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-10 bg-fondo/90 backdrop-blur border-b border-black/5">
        <div className="mx-auto max-w-[1600px] px-5 py-3 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-rocoto">
              <RocotoLogo className="w-9 h-9" />
            </span>
            <div className="leading-tight">
              <p className="font-display font-extrabold text-lg text-rocoto">
                Rocoto Ciudadano
              </p>
              <p className="text-xs text-tinta-suave -mt-0.5">Acceso Claro a la Ley</p>
            </div>
          </Link>
          <Link
            href="/"
            className="ml-auto rounded-xl border border-rocoto/30 text-rocoto text-sm font-bold px-4 py-2 hover:bg-rocoto-soft transition"
          >
            ← Inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] px-5 pb-16 flex-1">
        <section className="pt-8 pb-6 text-center">
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-tinta">
            Últimas leyes que <span className="text-rocoto">cambiaron otras leyes</span> ✏️
          </h1>
          <p className="mt-3 text-tinta-suave text-base sm:text-lg max-w-2xl mx-auto">
            Las mismas 3 respuestas de siempre — qué dice, a quién afecta y cuánto
            sale de tu bolsillo — para que entiendas qué se cambió, sin enredos.
          </p>
        </section>

        {leyes.length === 0 ? (
          <p className="text-tinta-suave text-center py-10">
            Aún no hay leyes modificadas explicadas. Cuando se publiquen, aparecerán
            aquí con sus 3 respuestas.
          </p>
        ) : (
          <ListaLeyes leyes={leyes} />
        )}
      </main>

      <footer className="border-t border-black/5 py-6">
        <p className="mx-auto max-w-[1600px] px-5 text-center text-xs text-tinta-suave">
          Gratis siempre · Traducimos, no opinamos · Cada ley enlaza a su fuente
          oficial.
        </p>
      </footer>
    </div>
  );
}
