# Supabase CLI 배포 스크립트

Write-Host "=== Supabase CLI로 함수 배포 ===" -ForegroundColor Cyan
Write-Host ""

# 1. 프로젝트 링크
Write-Host "1. 프로젝트 링크 중..." -ForegroundColor Yellow
npx supabase link --project-ref qmhxnxnaawtjelqlgyig

Write-Host ""
Write-Host "2. 함수 배포 중..." -ForegroundColor Yellow
npx supabase functions deploy sync-stibee-subscribers

Write-Host ""
Write-Host "3. 환경 변수 설정 중..." -ForegroundColor Yellow
npx supabase secrets set STIBEE_API_KEY=api52c730f2b04db7709884c860251373efc943ed246be2b1c89b7c15b40201e321a17c5a227662bb24f423699bb5f7b218c198cad81c0c09f4623ed59a94c1c921
npx supabase secrets set STIBEE_LIST_ID=289942

Write-Host ""
Write-Host "=== 배포 완료! ===" -ForegroundColor Green
Write-Host ""
Write-Host "테스트 명령어:" -ForegroundColor Cyan
Write-Host '$headers = @{"Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaHhueG5hYXd0amVscWxneWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5ODI0NSwiZXhwIjoyMDkyNjc0MjQ1fQ.HtG6kEREE7zzPUuxDhItQjsp2PffT5Z1mDXKBcDElrg"}' -ForegroundColor Gray
Write-Host 'Invoke-RestMethod -Uri "https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers" -Method POST -Headers $headers -Body "{}"' -ForegroundColor Gray
