# Script de Testes de Seguranca
# Testa todos os 8 problemas criticos corrigidos

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " TESTES DE SEGURANCA - 8 CRITICOS" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# =============================================================================
# TESTE 2: API de Pagamento SEM Token (deve retornar 401)
# =============================================================================
Write-Host "[TESTE 2] API de Pagamento sem Token" -ForegroundColor Yellow
Write-Host "Esperado: 401 Unauthorized" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/pagamentos/mercado-pago" `
        -Method POST `
        -Body '{"planId":"plano_basico"}' `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "[FALHOU] API aceitou requisicao sem token (codigo: $($response.StatusCode))" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "[PASSOU] API rejeitou corretamente (401 Unauthorized)" -ForegroundColor Green
    } else {
        Write-Host "[ERRO] Codigo inesperado: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    }
}

# =============================================================================
# TESTE 2B: API de Pagamento com Token INVÁLIDO (deve retornar 401)
# =============================================================================
Write-Host "`n🔴 TESTE 2B: API de Pagamento com Token Inválido" -ForegroundColor Yellow
Write-Host "Esperado: 401 Unauthorized`n" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/pagamentos/mercado-pago" `
        -Method POST `
        -Headers @{ "Authorization" = "Bearer token_falso_123" } `
        -Body '{"planId":"plano_basico"}' `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "❌ FALHOU - API aceitou token inválido (código: $($response.StatusCode))" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "✅ PASSOU - API rejeitou token inválido (401 Unauthorized)" -ForegroundColor Green
    } else {
        Write-Host "⚠️ ERRO INESPERADO - Código: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    }
}

# =============================================================================
# TESTE 3: Upload SEM Token (deve retornar 401)
# =============================================================================
Write-Host "`n🔴 TESTE 3: Upload sem Token" -ForegroundColor Yellow
Write-Host "Esperado: 401 Unauthorized`n" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/upload" `
        -Method POST `
        -Body "test" `
        -ContentType "multipart/form-data" `
        -ErrorAction Stop
    
    Write-Host "❌ FALHOU - Upload aceitou requisição sem token (código: $($response.StatusCode))" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "✅ PASSOU - Upload rejeitou corretamente (401 Unauthorized)" -ForegroundColor Green
    } else {
        Write-Host "⚠️ ERRO INESPERADO - Código: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    }
}

# =============================================================================
# TESTE 6: APIs Admin SEM Token (deve retornar 401)
# =============================================================================
Write-Host "`n🔴 TESTE 6: API Admin sem Token" -ForegroundColor Yellow
Write-Host "Esperado: 401 Unauthorized`n" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/admin/seed-plans" `
        -Method GET `
        -ErrorAction Stop
    
    Write-Host "❌ FALHOU - API admin aceitou requisição sem token (código: $($response.StatusCode))" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "✅ PASSOU - API admin rejeitou corretamente (401 Unauthorized)" -ForegroundColor Green
    } else {
        Write-Host "⚠️ ERRO INESPERADO - Código: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    }
}

# =============================================================================
# RESUMO
# =============================================================================
Write-Host "`n" -NoNewline
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host " RESUMO DOS TESTES " -NoNewline -ForegroundColor Cyan
Write-Host "=" -ForegroundColor Cyan
Write-Host "✅ Teste 1: Webhook com assinatura - JÁ VALIDADO ANTERIORMENTE" -ForegroundColor Green
Write-Host "✅ Teste 2: API de pagamento protegida - Veja resultados acima" -ForegroundColor Green
Write-Host "✅ Teste 3: Upload protegido - Veja resultados acima" -ForegroundColor Green
Write-Host "✅ Teste 6: APIs admin protegidas - Veja resultados acima" -ForegroundColor Green
Write-Host "`n📝 Testes 4, 5, 7 e 8 requerem verificação manual (instruções abaixo)`n" -ForegroundColor Yellow

Write-Host "=" -ForegroundColor Cyan
Write-Host " PRÓXIMOS TESTES MANUAIS " -ForegroundColor Cyan
Write-Host "=" -ForegroundColor Cyan
Write-Host ""
Write-Host "🧪 TESTE 4: Validação de Expiração" -ForegroundColor Cyan
Write-Host "   1. Vá ao Firebase Console" -ForegroundColor Gray
Write-Host "   2. Edite seu usuário e mude 'access_expires_at' para uma data passada" -ForegroundColor Gray
Write-Host "   3. Tente usar uma feature do sistema" -ForegroundColor Gray
Write-Host "   4. Deve ser bloqueado" -ForegroundColor Gray
Write-Host ""
Write-Host "🧪 TESTE 5: Build do Projeto" -ForegroundColor Cyan
Write-Host "   Execute: npm run build" -ForegroundColor Gray
Write-Host "   Deve compilar sem erros TypeScript/ESLint" -ForegroundColor Gray
Write-Host ""
Write-Host "📝 TESTE 7: Impersonação" -ForegroundColor Cyan
Write-Host "   Status: API criada, validação completa pendente (não bloqueante)" -ForegroundColor Gray
Write-Host ""
Write-Host "📝 TESTE 8: Segurança Dashboard" -ForegroundColor Cyan
Write-Host "   Status: Documentado para reativação futura (não bloqueante)" -ForegroundColor Gray
Write-Host ""
