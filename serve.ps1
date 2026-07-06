# ============================================================
# Mini server locale per provare l'app sul PC (non serve internet).
# Avvialo con doppio clic su AVVIA-APP.bat, poi apri
# http://localhost:8765 nel browser (si apre da solo).
# Per chiudere: chiudi questa finestra.
# ============================================================
$cartella = $PSScriptRoot
$porta = 8765

$mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.webmanifest' = 'application/manifest+json; charset=utf-8'
    '.png'  = 'image/png'
    '.svg'  = 'image/svg+xml'
    '.ico'  = 'image/x-icon'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$porta/")
$listener.Start()
Write-Host ""
Write-Host "  App in ascolto su http://localhost:$porta" -ForegroundColor Green
Write-Host "  Lascia aperta questa finestra mentre usi l'app." -ForegroundColor DarkGray
Write-Host ""

Start-Process "http://localhost:$porta"

while ($listener.IsListening) {
    try { $ctx = $listener.GetContext() } catch { break }
    $req = $ctx.Request
    $res = $ctx.Response

    $percorso = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)
    if ($percorso -eq '/') { $percorso = '/index.html' }
    $file = Join-Path $cartella ($percorso -replace '/', '\')

    # sicurezza: non uscire dalla cartella dell'app
    $fileCompleto = [System.IO.Path]::GetFullPath($file)
    if (-not $fileCompleto.StartsWith($cartella, [System.StringComparison]::OrdinalIgnoreCase)) {
        $res.StatusCode = 403; $res.Close(); continue
    }

    if (Test-Path $fileCompleto -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($fileCompleto).ToLower()
        $tipo = $mime[$ext]
        if (-not $tipo) { $tipo = 'application/octet-stream' }
        $bytes = [System.IO.File]::ReadAllBytes($fileCompleto)
        $res.ContentType = $tipo
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $res.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes('404 - non trovato')
        $res.OutputStream.Write($msg, 0, $msg.Length)
    }
    $res.Close()
}
