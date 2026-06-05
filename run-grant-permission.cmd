@echo off
chcp 65001 >nul
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  GA4 Service Account 권한 자동 부여 스크립트               ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo 📋 사전 준비:
echo.
echo 1. Google Cloud Console에서 OAuth 2.0 클라이언트 생성:
echo    https://console.cloud.google.com/apis/credentials?project=hokex-498415
echo.
echo 2. "사용자 인증 정보 만들기" -^> "OAuth 클라이언트 ID"
echo    - 애플리케이션 유형: "데스크톱 앱"
echo    - 이름: "GA4 권한 부여"
echo.
echo 3. JSON 다운로드 후 client_id와 client_secret 복사
echo.
echo ════════════════════════════════════════════════════════════
echo.

set /p CLIENT_ID="CLIENT_ID를 입력하세요: "
set /p CLIENT_SECRET="CLIENT_SECRET를 입력하세요: "

echo.
echo ✅ 환경 변수 설정 완료
echo.
echo 📦 필요한 패키지 설치 중...
call npm install googleapis readline 2>nul

echo.
echo 🚀 권한 부여 스크립트 실행 중...
echo.

node grant-ga4-permission.js

echo.
echo ════════════════════════════════════════════════════════════
echo 완료! 이제 Supabase Edge Function을 테스트하세요.
echo ════════════════════════════════════════════════════════════
echo.
pause
