// Isotipo de Rocoto Ciudadano: el ají-globo-de-chat (logo oficial del usuario).
// Se recortó del logo completo a public/logo-pepper.png. Mantiene la misma API
// (recibe className) para que todos los usos sigan funcionando igual.

export function RocotoLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-pepper.png"
      alt="Rocoto Ciudadano"
      className={`${className} object-contain`}
    />
  );
}
