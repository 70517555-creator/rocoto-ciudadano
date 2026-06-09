// Las etiquetas orientadoras de una ley: tema, semáforo del bolsillo, naturaleza
// y modificatoria. Presentacionales (sin estado). Íconos profesionales (Phosphor).

import type { Icon } from "@phosphor-icons/react";
import {
  Heartbeat,
  Briefcase,
  House,
  GraduationCap,
  Money,
  ShieldCheck,
  Leaf,
  Bus,
  Scales,
  MaskHappy,
  DotsThreeOutline,
  CheckCircle,
  Megaphone,
  PencilSimple,
  TrendUp,
  TrendDown,
  Minus,
} from "@phosphor-icons/react/dist/ssr";
import type { ImpactoBolsillo, Naturaleza, Tema } from "@/lib/groq";

// Un ícono profesional por tema (se usa en el chip y en el filtro de la portada).
export const ICONO_TEMA: Record<Tema, Icon> = {
  Salud: Heartbeat,
  Trabajo: Briefcase,
  Vivienda: House,
  Educación: GraduationCap,
  Economía: Money,
  Seguridad: ShieldCheck,
  "Medio ambiente": Leaf,
  Transporte: Bus,
  Justicia: Scales,
  Cultura: MaskHappy,
  Otros: DotsThreeOutline,
};

// Chip del tema (categoría).
export function TemaChip({ tema }: { tema?: Tema }) {
  if (!tema) return null;
  const Icono = ICONO_TEMA[tema];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-black/5 text-tinta text-xs font-semibold px-2.5 py-1">
      <Icono className="w-3.5 h-3.5" weight="fill" /> {tema}
    </span>
  );
}

// Semáforo del bolsillo: verde te beneficia, rojo te cuesta, gris neutro.
export function SemaforoBolsillo({ impacto }: { impacto?: ImpactoBolsillo }) {
  if (!impacto) return null;

  const config = {
    beneficia: { Icono: TrendUp, clase: "bg-tallo-soft text-tallo", texto: "Te beneficia" },
    cuesta: { Icono: TrendDown, clase: "bg-rocoto-soft text-rocoto-dark", texto: "Te cuesta" },
    neutro: { Icono: Minus, clase: "bg-black/5 text-tinta-suave", texto: "Neutro" },
  }[impacto];

  const Icono = config.Icono;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md text-xs font-bold px-2.5 py-1 ${config.clase}`}
    >
      <Icono className="w-3.5 h-3.5" weight="bold" />
      {config.texto}
    </span>
  );
}

// Naturaleza: ¿la ley hace algo real o solo declara una intención?
export function NaturalezaChip({ naturaleza }: { naturaleza?: Naturaleza }) {
  if (!naturaleza) return null;

  if (naturaleza === "intencion") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1">
        <Megaphone className="w-3.5 h-3.5" weight="fill" /> Solo declara intención
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-tallo-soft text-tallo text-xs font-bold px-2.5 py-1">
      <CheckCircle className="w-3.5 h-3.5" weight="fill" /> Crea algo real
    </span>
  );
}

// ¿Esta ley CAMBIA otra ley? Un chip discreto, no un cartel acusador.
export function ModificaChip({ esModificatoria }: { esModificatoria?: boolean }) {
  if (!esModificatoria) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1">
      <PencilSimple className="w-3.5 h-3.5" weight="fill" /> Modifica otra ley
    </span>
  );
}
