# Stibee 동기화 함수 직접 호출 테스트

$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaHhueG5hYXd0amVscWxneWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5ODI0NSwiZXhwIjoyMDkyNjc0MjQ1fQ.HtG6kEREE7zzPUuxDhItQjsp2PffT5Z1mDXKBcDElrg"
    "Content-Type" = "application/json"
}

Write-Host "=== Stibee 동기화 함수 호출 중... ===" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod `
        -Uri "https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers" `
        -Method POST `
        -Headers $headers `
        -Body '{}' `
        -ErrorAction Stop
    
    Write-Host "✅ 성공!" -ForegroundColor Green
    Write-Host ""
    Write-Host "응답:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 10
    
} catch {
    Write-Host "❌ 에러 발생!" -ForegroundColor Red
    Write-Host ""
    Write-Host "상태 코드: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "에러 메시지: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "상세 에러:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message
    }
}

Write-Host ""
Write-Host "=== 테스트 완료 ===" -ForegroundColor Cyan
