# Vigilante diario de Rocoto Ciudadano (para Tarea Programada de Windows).
# 1) Levanta el servidor si está apagado.  2) Detecta modificatorias nuevas.
# 3) Explica las pendientes (a las 3 respuestas).  4) Deja un registro del día.
# Correr a mano:  powershell -ExecutionPolicy Bypass -File scripts\vigilante-diario.ps1

$ErrorActionPreference = "Continue"
$proyecto = "D:\WEBNEW\ley-clara"
Set-Location $proyecto
$log = Join-Path $proyecto ("data\vigilante-" + (Get-Date -Format "yyyy-MM-dd") + ".log")

function Log($m) {
  $linea = "{0}  {1}" -f (Get-Date -Format "HH:mm:ss"), $m
  $linea | Tee-Object -FilePath $log -Append
}

Log "===== Vigilante Rocoto ====="

# ¿El servidor responde?
$arriba = $false
try {
  Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing | Out-Null
  $arriba = $true
} catch {}

# Si está apagado, lo iniciamos temporalmente (y recordamos para apagarlo al final).
$inicieYo = $null
if (-not $arriba) {
  Log "Servidor apagado. Lo inicio temporalmente..."
  $inicieYo = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev" `
    -WorkingDirectory $proyecto -PassThru -WindowStyle Hidden
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 2
    try {
      Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 3 -UseBasicParsing | Out-Null
      $arriba = $true; break
    } catch {}
  }
}

if (-not $arriba) {
  Log "No pude levantar el servidor. Salgo."
  exit 1
}

Log "Detectando novedades del dia..."
& node scripts\actualizar.mjs *>> $log

Log "Explicando pendientes (segun cupo de Groq)..."
& node scripts\explicar-todas.mjs *>> $log

# Si yo inicié el servidor, lo apago (su árbol completo).
if ($inicieYo) {
  Log "Apago el servidor temporal (PID $($inicieYo.Id))."
  taskkill /PID $inicieYo.Id /T /F *>> $log
}

Log "===== Fin ====="
