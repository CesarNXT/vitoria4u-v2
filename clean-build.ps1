# Script para limpar arquivos problemáticos e executar build
Write-Host "Limpando arquivos de build..." -ForegroundColor Yellow

# Tentar remover o arquivo trace problemático
$tracePath = ".\.next\trace"
if (Test-Path $tracePath) {
    try {
        Remove-Item $tracePath -Force -ErrorAction Stop
        Write-Host "Arquivo trace removido com sucesso" -ForegroundColor Green
    } catch {
        Write-Host "Não foi possível remover o arquivo trace, continuando..." -ForegroundColor Yellow
    }
}

Write-Host "Iniciando build..." -ForegroundColor Cyan
npm run build
