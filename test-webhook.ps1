# Script para testar webhook localmente
# Simula o webhook que o MercadoPago enviou

$body = @{
    action = "payment.updated"
    api_version = "v1"
    data = @{
        id = "129620564660"
    }
    date_created = "2025-10-12T05:29:48.617+00:00"
    id = "129620564660"
    live_mode = $false
    type = "payment"
    user_id = "1813266115"
} | ConvertTo-Json

# Faça a requisição
Invoke-RestMethod -Uri "http://localhost:3000/api/pagamentos/webhook" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

Write-Host "✅ Webhook enviado com sucesso!"
