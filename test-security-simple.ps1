# ============================================================================
# TESTES DE SEGURANCA - 8 PROBLEMAS CRITICOS
# ============================================================================

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " INICIANDO TESTES DE SEGURANCA" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$testsPassados = 0
$testsFalhados = 0

# ============================================================================
# TESTE 2: API de Pagamento SEM Token
# ============================================================================
Write-Host "[TESTE 2] API de Pagamento sem Token" -ForegroundColor Yellow
Write-Host "Esperado: 401 Unauthorized" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/pagamentos/mercado-pago" `
        -Method POST `
        -Body '{"planId":"plano_basico"}' `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "[FALHOU] API aceitou requisicao sem token" -ForegroundColor Red
    $testsFalhados++
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "[PASSOU] API rejeitou corretamente (401)" -ForegroundColor Green
        $testsPassados++
    } else {
        Write-Host "[ERRO] Codigo: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
        $testsFalhados++
    }
}

Write-Host ""

# ============================================================================
# TESTE 2B: API de Pagamento com Token INVALIDO
# ============================================================================
Write-Host "[TESTE 2B] API de Pagamento com Token Invalido" -ForegroundColor Yellow
Write-Host "Esperado: 401 Unauthorized" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/pagamentos/mercado-pago" `
        -Method POST `
        -Headers @{ "Authorization" = "Bearer token_falso_123" } `
        -Body '{"planId":"plano_basico"}' `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "[FALHOU] API aceitou token invalido" -ForegroundColor Red
    $testsFalhados++
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "[PASSOU] API rejeitou token invalido (401)" -ForegroundColor Green
        $testsPassados++
    } else {
        Write-Host "[ERRO] Codigo: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
        $testsFalhados++
    }
}

Write-Host ""

# ============================================================================
# TESTE 3: Upload SEM Token
# ============================================================================
Write-Host "[TESTE 3] Upload sem Token" -ForegroundColor Yellow
Write-Host "Esperado: 401 Unauthorized" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/upload" `
        -Method POST `
        -Body "test" `
        -ContentType "multipart/form-data" `
        -ErrorAction Stop
    
    Write-Host "[FALHOU] Upload aceitou requisicao sem token" -ForegroundColor Red
    $testsFalhados++
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "[PASSOU] Upload rejeitou corretamente (401)" -ForegroundColor Green
        $testsPassados++
    } else {
        Write-Host "[ERRO] Codigo: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
        $testsFalhados++
    }
}

Write-Host ""

# ============================================================================
# TESTE 6: API Admin SEM Token
# ============================================================================
Write-Host "[TESTE 6] API Admin sem Token" -ForegroundColor Yellow
Write-Host "Esperado: 401 Unauthorized" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/admin/seed-plans" `
        -Method GET `
        -ErrorAction Stop
    
    Write-Host "[FALHOU] API admin aceitou requisicao sem token" -ForegroundColor Red
    $testsFalhados++
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "[PASSOU] API admin rejeitou corretamente (401)" -ForegroundColor Green
        $testsPassados++
    } else {
        Write-Host "[ERRO] Codigo: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
        $testsFalhados++
    }
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " RESUMO DOS TESTES" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Testes Passados: $testsPassados" -ForegroundColor Green
Write-Host "Testes Falhados: $testsFalhados" -ForegroundColor $(if ($testsFalhados -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($testsPassados -eq 4 -and $testsFalhados -eq 0) {
    Write-Host "RESULTADO: TODOS OS TESTES PASSARAM!" -ForegroundColor Green
    Write-Host "Sistema pronto para producao!" -ForegroundColor Green
} else {
    Write-Host "ATENCAO: Alguns testes falharam!" -ForegroundColor Yellow
    Write-Host "Revise as correcoes antes do deploy" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Cyan
Write-Host "1. Execute: npm run build" -ForegroundColor Gray
Write-Host "2. Se build passar, sistema esta pronto!" -ForegroundColor Gray
Write-Host ""
