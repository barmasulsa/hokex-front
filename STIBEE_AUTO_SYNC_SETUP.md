# Stibee 구독자 자동 동기화 설정 가이드

## 개요
매 시간마다 Stibee 구독자를 자동으로 DB에 동기화합니다.

## 설정 방법

### 1. Supabase Dashboard 접속
1. https://supabase.com/dashboard 로그인
2. 프로젝트 선택: `qmhxnxnaawtjelqlgyig`
3. 왼쪽 메뉴에서 **SQL Editor** 클릭

### 2. Cron Job 생성
1. **New Query** 버튼 클릭
2. `hokex-front/supabase-migrations/create-stibee-sync-cron.sql` 파일 내용 전체 복사해서 붙여넣기
3. **Run** 버튼 클릭

### 3. 설정 확인
아래 SQL로 Cron Job이 정상 등록되었는지 확인:

```sql
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job 
WHERE jobname = 'stibee-sync-hourly';
```

**예상 결과:**
- `stibee-sync-hourly`: `0 * * * *` (매 시간 정각)
- `active`: `true`

## 동작 방식

### 자동 실행 주기 (현재 설정)
- **매 시간 정각**: 1:00, 2:00, 3:00, ... 24:00
- 하루 24번 자동 실행
- 최대 지연: 1시간

### 1분 주기로 변경 가능
- **매분 실행**: 1:00, 1:01, 1:02, ...
- 하루 1,440번 자동 실행
- 최대 지연: 1분
- **비용**: 월 43,200번 (무료 범위의 2.16%) ✅
- **렉**: 없음 (서버리스 실행) ✅

### 장점
- **최신 데이터 유지**: 구독자 정보가 항상 최신 상태
- **웹훅 보완**: 웹훅이 놓친 구독자를 빠르게 보완
- **무료 범위 내**: Supabase Edge Function 월 200만 건 무료
  - 1시간 주기: 월 720번 (0.036%)
  - 1분 주기: 월 43,200번 (2.16%)

### 백그라운드 실행
- 서버에서 자동 실행되므로 사용자에게 영향 없음
- 렉 없음, 성능 저하 없음

### 실시간 동기화
- Stibee 웹훅이 이미 설정되어 있어 실시간 동기화도 작동
- Cron은 혹시 놓친 구독자를 보완하는 역할

## 수동 실행 (테스트용)

Cron 대기 없이 즉시 동기화하려면:

1. **SQL Editor**에서 실행:
```sql
SELECT
  net.http_post(
    url:='https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
```

2. 또는 **Edge Functions** 페이지에서 `sync-stibee-subscribers` 직접 실행

## Cron Job 관리

### 일시 중지
```sql
SELECT cron.unschedule('stibee-sync-hourly');
```

### 재시작
```sql
-- 위 "2. Cron Job 생성" 단계의 SQL을 다시 실행
```

### 주기 변경
예: 2시간마다로 변경
```sql
-- 기존 삭제
SELECT cron.unschedule('stibee-sync-hourly');

-- 새 주기로 재등록
SELECT cron.schedule(
  'stibee-sync-hourly',
  '0 */2 * * *', -- 2시간마다
  $
  SELECT
    net.http_post(
      url:='https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $
);
```

## 로그 확인

Cron 실행 로그는 Supabase Dashboard에서 확인:
1. **Edge Functions** 메뉴
2. `sync-stibee-subscribers` 선택
3. **Logs** 탭에서 실행 기록 확인

## 문제 해결

### Cron이 실행되지 않는 경우
1. `pg_cron` extension 활성화 확인
2. Cron Job 등록 확인 (위 확인 SQL 실행)
3. Edge Function이 정상 배포되어 있는지 확인

### 동기화 실패 시
- Edge Function 로그에서 에러 확인
- Stibee API 키가 올바른지 확인 (`.env` 파일)
- 수동 실행으로 테스트

## 완료!

이제 매 시간마다 자동으로 Stibee 구독자가 동기화됩니다.
