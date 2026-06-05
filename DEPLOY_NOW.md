# Edge Functions 배포 완료 - 다음 단계

## ✅ 완료된 작업
1. Scoop 패키지 매니저 설치 완료
2. Supabase CLI 2.105.0 설치 완료
3. Supabase 로그인 완료

## 🚨 현재 상태
프로젝트 연결이 필요합니다.

## 📝 다음 단계

### 1. 프로젝트 참조 ID 확인
Supabase Dashboard에서 프로젝트 참조 ID를 확인하세요:
- https://app.supabase.com/project/YOUR_PROJECT/settings/general
- "Reference ID" 항목을 복사

### 2. 프로젝트 연결
```powershell
cd "c:\Users\lcw55\OneDrive\바탕 화면\ai_mice\hokex-front"
supabase link --project-ref YOUR_PROJECT_REF
```

### 3. 모든 Edge Functions 배포
```powershell
supabase functions deploy --project-ref YOUR_PROJECT_REF
```

또는 개별 배포:
```powershell
supabase functions deploy check-stibee-subscriber --project-ref YOUR_PROJECT_REF
supabase functions deploy send-otp-code --project-ref YOUR_PROJECT_REF
supabase functions deploy verify-otp-code --project-ref YOUR_PROJECT_REF
supabase functions deploy stibee-webhook --project-ref YOUR_PROJECT_REF
supabase functions deploy sync-stibee-subscribers --project-ref YOUR_PROJECT_REF
supabase functions deploy unsubscribe-stibee --project-ref YOUR_PROJECT_REF
supabase functions deploy update-visitor-stats-cache --project-ref YOUR_PROJECT_REF
supabase functions deploy get-ga-stats --project-ref YOUR_PROJECT_REF
supabase functions deploy update-today-stats --project-ref YOUR_PROJECT_REF
```

## 🔑 배포할 Edge Functions (9개)

1. **check-stibee-subscriber** - Stibee 구독자 확인
2. **send-otp-code** - OTP 코드 이메일 발송
3. **verify-otp-code** - OTP 코드 검증
4. **stibee-webhook** - Stibee 웹훅 처리
5. **sync-stibee-subscribers** - Stibee 구독자 동기화
6. **unsubscribe-stibee** - Stibee 구독 해지
7. **update-visitor-stats-cache** - 방문자 통계 캐시 업데이트
8. **get-ga-stats** - Google Analytics 통계 가져오기
9. **update-today-stats** - 오늘 통계 업데이트

## ⚙️ 배포 후 설정 필요

### 환경 변수 설정 (Supabase Dashboard)
1. Dashboard > Settings > Edge Functions > Environment Variables
2. 다음 변수 추가:

```
RESEND_API_KEY=YOUR_RESEND_API_KEY
STIBEE_API_KEY=YOUR_STIBEE_API_KEY
STIBEE_LIST_ID=YOUR_STIBEE_LIST_ID
```

### Cron Job 설정 (Supabase Dashboard > Database > Cron)
```sql
-- 1. Stibee 구독자 동기화 (1분마다)
SELECT cron.schedule(
  'sync-stibee-every-minute',
  '*/1 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-stibee-subscribers',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) AS request_id;
  $$
);

-- 2. 방문자 통계 업데이트 (매일 자정)
SELECT cron.schedule(
  'update-visitor-cache-daily',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/update-visitor-stats-cache',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) AS request_id;
  $$
);
```

## 🧪 배포 테스트

배포 완료 후 테스트:

```bash
# 1. check-stibee-subscriber 테스트
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-stibee-subscriber" \
  -H "Content-Type: application/json" \
  -d '{"email":"lcw5525@naver.com"}'

# 2. send-otp-code 테스트
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-otp-code" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## 📊 배포 상태 확인

```powershell
# 배포된 Function 목록 확인
supabase functions list --project-ref YOUR_PROJECT_REF

# 특정 Function 로그 확인
supabase functions logs check-stibee-subscriber --project-ref YOUR_PROJECT_REF
```

## ❓ 문제 해결

### "Not Found" 에러가 발생하면:
1. 프로젝트 참조 ID가 올바른지 확인
2. 프로젝트에 Edge Functions가 활성화되어 있는지 확인
3. `supabase link` 명령으로 프로젝트 연결 확인

### Import Map 경고가 나오면:
- 현재는 무시해도 됩니다
- 향후 각 Function에 `deno.json` 파일을 추가하여 개선 가능

## 🎯 다음 작업

배포 완료 후:
1. ✅ 환경 변수 설정
2. ✅ Cron Job 설정
3. ✅ Stibee Webhook URL 설정
4. ✅ 프론트엔드에 Function URL 적용
5. ✅ 로그인 플로우 테스트
