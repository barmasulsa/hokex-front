# OTP Edge Function 재배포 스크립트

Write-Host "🚀 OTP Edge Function 재배포 시작..." -ForegroundColor Cyan

# Supabase CLI 확인
if (!(Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Supabase CLI가 설치되어 있지 않습니다." -ForegroundColor Red
    Write-Host "설치: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# 로그인 확인
Write-Host "📝 Supabase에 로그인되어 있는지 확인 중..." -ForegroundColor Yellow
supabase projects list

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Supabase 로그인이 필요합니다." -ForegroundColor Red
    Write-Host "실행: supabase login" -ForegroundColor Yellow
    exit 1
}

# Edge Function 배포
Write-Host "📦 send-otp-code 함수 배포 중..." -ForegroundColor Yellow
supabase functions deploy send-otp-code --no-verify-jwt

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 배포 성공!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔍 다음 단계:" -ForegroundColor Cyan
    Write-Host "1. Supabase Dashboard → Edge Functions → Logs 확인" -ForegroundColor White
    Write-Host "2. test-otp-local.html에서 다시 테스트" -ForegroundColor White
    Write-Host "3. 이메일 수신 확인" -ForegroundColor White
} else {
    Write-Host "❌ 배포 실패. 위 에러 메시지를 확인하세요." -ForegroundColor Red
    exit 1
}
