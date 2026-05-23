# 🔍 sync-stibee-subscribers 함수 테스트

## ✅ 배포 확인됨
- 함수가 성공적으로 배포되었습니다
- 이제 함수 호출을 테스트합니다

## 📋 테스트 방법

### 1. PowerShell에서 실행 (Service Role Key 사용):
```powershell
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaHhueG5hYXd0amVscWxneWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5ODI0NSwiZXhwIjoyMDkyNjc0MjQ1fQ.HtG6kEREE7zzPUuxDhItQjsp2PffT5Z1mDXKBcDElrg"
    "Content-Type" = "application/json"
}

Invoke-WebRequest -Uri "https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers" -Method POST -Headers $headers
```

### 2. 또는 간단한 버전:
```powershell
Invoke-RestMethod -Uri "https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers" -Method POST -Headers @{"Authorization"="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaHhueG5hYXd0amVscWxneWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5ODI0NSwiZXhwIjoyMDkyNjc0MjQ1fQ.HtG6kEREE7zzPUuxDhItQjsp2PffT5Z1mDXKBcDElrg"}
```

### 3. Git Bash에서 실행:
```bash
curl -X POST \
  "https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaHhueG5hYXd0amVscWxneWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5ODI0NSwiZXhwIjoyMDkyNjc0MjQ1fQ.HtG6kEREE7zzPUuxDhItQjsp2PffT5Z1mDXKBcDElrg" \
  -H "Content-Type: application/json"
```

## 🔍 예상 결과

### 성공 시:
```json
{
  "success": true,
  "totalFetched": 10,
  "inserted": 10,
  "errors": 0,
  "syncedAt": "2026-05-23T..."
}
```

### 실패 시 확인할 것:
1. Supabase Dashboard → Edge Functions → sync-stibee-subscribers → Logs 탭
2. 에러 메시지 확인
3. 환경 변수 설정 재확인

## 💡 참고
- 함수 배포 후 1-2분 정도 기다려야 할 수 있습니다
- 404 에러가 계속되면 함수 이름 철자를 다시 확인하세요
