# Rassemble tous les fichiers meubles\*.svg dans js\meubles-bundle.js,
# afin que l'application (ouverte en double-clic, sans serveur) puisse les lire.
# A relancer apres chaque ajout ou modification d'un meuble.
# (Fichier volontairement sans accents : Windows PowerShell 5.1 lit les scripts en ANSI.)
$ErrorActionPreference = 'Stop'
$racine = Split-Path -Parent $PSScriptRoot
$dossier = Join-Path $racine 'meubles'
$sortie = Join-Path $racine 'js\meubles-bundle.js'

$fichiers = Get-ChildItem -Path $dossier -Filter '*.svg' | Sort-Object Name
$table = [ordered]@{}
foreach ($f in $fichiers) {
    $table[$f.Name] = [IO.File]::ReadAllText($f.FullName, [Text.Encoding]::UTF8)
}
$json = $table | ConvertTo-Json -Compress
$js = "/* Genere par outils\assembler-meubles.ps1 - ne pas modifier a la main. */`nwindow.H = window.H || {};`nH.SVG_FILES = $json;`n"
[IO.File]::WriteAllText($sortie, $js, (New-Object Text.UTF8Encoding $false))
Write-Host "$($fichiers.Count) meubles assembles dans js\meubles-bundle.js"
