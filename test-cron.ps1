$headers = @{
    "Authorization" = "Bearer 9d9b248a-ab60-4303-86dc-8f47669ea57a"
}

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/campanhas/execute" -Method Get -Headers $headers

Write-Host "`n✅ RESPOSTA DO CRON:`n" -ForegroundColor Green
$response | ConvertTo-Json -Depth 10
