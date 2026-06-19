$body = @{
    account_id  = "test_account"
    number      = "+15551234567"
    from_number = "+19998887777"
    text        = "Try LoopSync!"
    date_sent   = "2026-06-18T17:00:00Z"
} | ConvertTo-Json

$headers = @{
    "Content-Type"              = "application/json"
    "ngrok-skip-browser-warning" = "true"
}

Write-Host "Sending test webhook to LoopSync..." -ForegroundColor Cyan

$response = Invoke-RestMethod `
    -Uri "https://arose-persuaded-manhunt.ngrok-free.dev/webhook/imessage" `
    -Method POST `
    -Headers $headers `
    -Body $body

Write-Host "Response:" -ForegroundColor Green
$response | ConvertTo-Json
