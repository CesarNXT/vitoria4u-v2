# ============================================================================
# TESTES DOS 3 CRITICOS CORRIGIDOS
# ============================================================================

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " TESTANDO 3 CORRECOES CRITICAS" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Certifique-se de que o servidor esta rodando (npm run dev)" -ForegroundColor Yellow
Write-Host ""

$passed = 0
$failed = 0

# ============================================================================
# TESTE 1: API de Pagamento SEM Token (deve retornar 401)
# ============================================================================
Write-Host "[TESTE 1] API de Pagamento sem Token" -ForegroundColor Cyan
Write-Host "Esperado: 401 Unauthorized" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/pagamentos/mercado-pago" `
        -Method POST `
        -Body '{"planId":"plano_basico"}' `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "[FALHOU] API aceitou requisicao sem token (Status: $($response.StatusCode))" -ForegroundColor Red
    $failed++
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "[PASSOU] API rejeitou corretamente (401 Unauthorized)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[ERRO] Status inesperado: $statusCode" -ForegroundColor Yellow
        Write-Host "Detalhes: $($_.Exception.Message)" -ForegroundColor Gray
        $failed++
    }
}

Write-Host ""

# ============================================================================
# TESTE 2: API de Pagamento com Token INVALIDO (deve retornar 401)
# ============================================================================
Write-Host "[TESTE 2] API de Pagamento com Token Invalido" -ForegroundColor Cyan
Write-Host "Esperado: 401 Unauthorized" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/pagamentos/mercado-pago" `
        -Method POST `
        -Headers @{ "Authorization" = "Bearer token_falso_12345" } `
        -Body '{"planId":"plano_basico"}' `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "[FALHOU] API aceitou token invalido (Status: $($response.StatusCode))" -ForegroundColor Red
    $failed++
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "[PASSOU] API rejeitou token invalido (401 Unauthorized)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[ERRO] Status inesperado: $statusCode" -ForegroundColor Yellow
        Write-Host "Detalhes: $($_.Exception.Message)" -ForegroundColor Gray
        $failed++
    }
}

Write-Host ""

# ============================================================================
# TESTE 3: Upload SEM Token (deve retornar 401)
# ============================================================================
Write-Host "[TESTE 3] Upload sem Token" -ForegroundColor Cyan
Write-Host "Esperado: 401 Unauthorized" -ForegroundColor Gray

try {
    # Criar arquivo temporario de teste
    $tempFile = [System.IO.Path]::GetTempFileName()
    "test content" | Out-File -FilePath $tempFile -Encoding ASCII
    
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/upload" `
        -Method POST `
        -InFile $tempFile `
        -ContentType "multipart/form-data" `
        -ErrorAction Stop
    
    Remove-Item $tempFile -ErrorAction SilentlyContinue
    Write-Host "[FALHOU] Upload aceitou requisicao sem token (Status: $($response.StatusCode))" -ForegroundColor Red
    $failed++
} catch {
    Remove-Item $tempFile -ErrorAction SilentlyContinue
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "[PASSOU] Upload rejeitou corretamente (401 Unauthorized)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[ERRO] Status inesperado: $statusCode" -ForegroundColor Yellow
        Write-Host "Detalhes: $($_.Exception.Message)" -ForegroundColor Gray
        $failed++
    }
}

Write-Host ""

# ============================================================================
# RESUMO
# ============================================================================
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " RESUMO DOS TESTES" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Testes Passados: $passed" -ForegroundColor Green
Write-Host "Testes Falhados: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($passed -eq 3 -and $failed -eq 0) {
    Write-Host "RESULTADO: TODOS OS TESTES PASSARAM!" -ForegroundColor Green
    Write-Host "As 3 correcoes criticas estao funcionando!" -ForegroundColor Green
} else {
    Write-Host "ATENCAO: Alguns testes falharam!" -ForegroundColor Yellow
    Write-Host "Revise os resultados acima." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " TESTE 4: EXPIRACAO DE PLANO" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este teste requer configuracao manual no Firebase:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Acesse Firebase Console" -ForegroundColor White
Write-Host "2. Firestore Database -> negocios -> Seu usuario" -ForegroundColor White
Write-Host "3. Edite 'access_expires_at' para uma data passada" -ForegroundColor White
Write-Host "   Exemplo: 2024-01-01T00:00:00.000Z" -ForegroundColor White
Write-Host "4. Tente criar um agendamento ou usar uma feature" -ForegroundColor White
Write-Host "5. Deve ser bloqueado!" -ForegroundColor White
Write-Host ""
Write-Host "Pressione ENTER quando concluir o teste manual..." -ForegroundColor Cyan
$null = Read-Host
Write-Host "Teste 4 marcado como concluido!" -ForegroundColor Green
Write-Host ""
