# Stibee 신규 구독자 동기화 문제 해결 가이드

## 문제 상황
- 신규 구독자가 Stibee에 추가됨
- DB에 동기화되지 않음
- 구독자 인증 실패로 메일 발송 불가

## 원인 진단 체크리스트

### 1단계: 웹훅 작동 확인

#### Stibee 웹훅 설정 확인
1. Stibee 대시보드 로그인
2. 주소록 → 설정 → 웹훅 메뉴
3. 확인 사항:
   - ✅ 웹훅 URL: `https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/stibee-webhook`
   - ✅ 이벤트: "구독" 체크되어 있는지
   - ✅ 상태: 활성화되어 있는지
   - ✅ 최근 전송 로그에서 성공/실패 확인

#### Supabase Edge Function 로그 확인
1. Supabase Dashboard 로그인
2. Edge Functions → `stibee-webhook` 선택
3. Logs 탭에서 확인:
   ```
   최근 웹훅 호출이 있는지?
   에러 메시지가 있는지?
   ```

#### 수동 웹훅 테스트
```bash
curl -X POST \
  https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/stibee-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "eventOccuredBy": "subscribe",
    "subscriber": {
      "email": "test@example.com"
    }
  }'
```

예상 응답:
```json
{
  "success": true,
  "message": "Subscriber synced",
  "email": "test@example.com"
}
```

### 2단계: DB 동기화 확인

#### 최근 구독자 확인
```sql
-- Supabase SQL Editor에서 실행
SELECT 
  email,
  subscribed_at,
  source,
  created_at
FROM stibee_subscribers
ORDER BY created_at DESC
LIMIT 10;
```

확인 사항:
- 최근 구독자가 있는지?
- `source` 필드가 'webhook' 또는 'stibee_api'인지?
- 시간이 최근인지?

#### 특정 이메일 검색
```sql
SELECT * FROM stibee_subscribers 
WHERE email = '구독자이메일@example.com';
```

### 3단계: 배치 동기화 확인

#### 수동 동기화 실행
```sql
-- Supabase SQL Editor에서 실행
SELECT
  net.http_post(
    url:='https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
```

#### 동기화 함수 로그 확인
1. Edge Functions → `sync-stibee-subscribers` 선택
2. Logs 탭에서 확인:
   - 성공적으로 실행되었는지?
   - 몇 명의 구독자를 동기화했는지?
   - 에러가 있는지?

### 4단계: Stibee API 키 확인

#### Edge Function 환경 변수 확인
1. Edge Functions → `sync-stibee-subscribers` 선택
2. Settings 탭에서 확인:
   - `STIBEE_API_KEY`: 올바른 API 키가 설정되어 있는지?
   - `STIBEE_LIST_ID`: 올바른 리스트 ID가 설정되어 있는지?

#### Stibee API 키 테스트
```bash
curl -X GET \
  "https://api.stibee.com/v1/lists/YOUR_LIST_ID/subscribers" \
  -H "AccessToken: YOUR_API_KEY"
```

## 해결 방안

### 방안 1: 웹훅이 작동하지 않는 경우

**원인**: Stibee 웹훅 설정 누락 또는 Edge Function 에러

**해결**:
1. Stibee 웹훅 재설정
2. Edge Function 재배포:
   ```bash
   cd hokex-front
   supabase functions deploy stibee-webhook
   ```

### 방안 2: 배치 동기화가 느린 경우

**원인**: 1시간 주기로 인한 지연

**해결**: 1분 주기로 변경
1. Supabase SQL Editor에서 실행:
   ```sql
   -- hokex-front/supabase-migrations/update-stibee-sync-to-1min.sql 파일 내용 실행
   ```
2. 확인:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'stibee-sync-every-minute';
   ```

### 방안 3: Stibee API 키 문제

**원인**: API 키 만료 또는 권한 부족

**해결**:
1. Stibee에서 새 API 키 발급
2. Supabase Edge Function 환경 변수 업데이트
3. Edge Function 재배포

## 권장 설정

### 최적 구성
```
웹훅 (실시간) + Cron Job (1분 주기)
```

**이유**:
- 웹훅: 즉시 반영 (0초 지연)
- Cron: 웹훅 실패 시 백업 (최대 1분 지연)
- 비용: 무료 범위 내 (월 43,200번 / 200만 건)
- 렉: 없음 (서버리스 실행)

### 비용 분석
| 주기 | 월 실행 횟수 | 무료 범위 대비 | 비용 |
|------|-------------|---------------|------|
| 1시간 | 720번 | 0.036% | 무료 |
| 1분 | 43,200번 | 2.16% | 무료 |
| 실시간(웹훅) | 구독자 수만큼 | 변동 | 무료 |

**결론**: 1분 주기로 변경해도 **비용 문제 없음** ✅

## 즉시 적용 방법

### 1분 주기 동기화 활성화

1. **Supabase Dashboard** 로그인
2. **SQL Editor** 클릭
3. **New Query** 클릭
4. 아래 SQL 복사 & 붙여넣기:

```sql
-- 기존 1시간 주기 삭제
SELECT cron.unschedule('stibee-sync-hourly');

-- 1분 주기로 변경
SELECT cron.schedule(
  'stibee-sync-every-minute',
  '* * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
```

5. **Run** 버튼 클릭
6. 확인:
```sql
SELECT * FROM cron.job WHERE jobname = 'stibee-sync-every-minute';
```

### 웹훅 재설정 (필요 시)

1. **Stibee 대시보드** 로그인
2. 주소록 → 설정 → 웹훅
3. 기존 웹훅 삭제 (있다면)
4. 새 웹훅 추가:
   - URL: `https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/stibee-webhook`
   - 이벤트: "구독" 체크
   - 저장

## 모니터링

### 실시간 모니터링
```sql
-- 최근 1분 내 추가된 구독자
SELECT * FROM stibee_subscribers
WHERE created_at > NOW() - INTERVAL '1 minute'
ORDER BY created_at DESC;

-- 웹훅 vs Cron 비율
SELECT 
  source,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM stibee_subscribers
GROUP BY source;
```

### Edge Function 로그
- Supabase Dashboard → Edge Functions → Logs
- 실시간 로그 확인
- 에러 발생 시 즉시 알림

## 문제 지속 시

1. **Stibee 고객 지원** 문의
   - 웹훅이 전송되는지 확인
   - 웹훅 전송 로그 요청

2. **Supabase 로그** 상세 분석
   - Edge Function 에러 메시지
   - DB 쿼리 실패 원인

3. **수동 동기화** 임시 조치
   - SQL Editor에서 수동 실행
   - 구독자 직접 추가

## 완료 체크리스트

- [ ] 웹훅 설정 확인 완료
- [ ] Edge Function 로그 확인 완료
- [ ] DB에 구독자 존재 확인 완료
- [ ] 1분 주기 Cron Job 설정 완료
- [ ] 테스트 구독자로 검증 완료
- [ ] 실제 구독자 동기화 확인 완료

