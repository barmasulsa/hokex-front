# Edge Function 배포 가이드

## 현재 상태
- Supabase CLI 설치가 PATH에 등록되지 않았거나, 설치가 완료되지 않았습니다
- Edge Function 파일들은 준비되어 있습니다

## 배포 방법

### 방법 1: Supabase Dashboard에서 직접 배포 (권장)

1. **Supabase Dashboard 접속**
   - https://app.supabase.com 접속
   - 프로젝트 선택

2. **Edge Functions 메뉴로 이동**
   - 왼쪽 메뉴에서 "Edge Functions" 클릭

3. **각 Function 배포**

#### Function 1: check-stibee-subscriber
```typescript
// 파일: supabase/functions/check-stibee-subscriber/index.ts
```
- Dashboard에서 "Deploy new function" 클릭
- Function 이름: `check-stibee-subscriber`
- 아래 파일 내용을 복사하여 붙여넣기

#### Function 2: send-otp-code
```typescript
// 파일: supabase/functions/send-otp-code/index.ts
```
- Function 이름: `send-otp-code`
- 파일 내용 복사 붙여넣기

#### Function 3: verify-otp-code
```typescript
// 파일: supabase/functions/verify-otp-code/index.ts
```
- Function 이름: `verify-otp-code`
- 파일 내용 복사 붙여넣기

#### Function 4: stibee-webhook
```typescript
// 파일: supabase/functions/stibee-webhook/index.ts
```
- Function 이름: `stibee-webhook`
- 파일 내용 복사 붙여넣기

#### Function 5: sync-stibee-subscribers
```typescript
// 파일: supabase/functions/sync-stibee-subscribers/index.ts
```
- Function 이름: `sync-stibee-subscribers`
- 파일 내용 복사 붙여넣기

#### Function 6: unsubscribe-stibee
```typescript
// 파일: supabase/functions/unsubscribe-stibee/index.ts
```
- Function 이름: `unsubscribe-stibee`
- 파일 내용 복사 붙여넣기

#### Function 7: update-visitor-stats-cache
```typescript
// 파일: supabase/functions/update-visitor-stats-cache/index.ts
```
- Function 이름: `update-visitor-stats-cache`
- 파일 내용 복사 붙여넣기

4. **환경 변수 설정**
   - 각 Function의 Settings에서 필요한 환경 변수 추가:
     - `RESEND_API_KEY`: OTP 이메일 발송용
     - `STIBEE_ACCESS_TOKEN`: Stibee API 연동용
     - 기타 필요한 변수들

### 방법 2: CLI 재설치 후 배포

1. **새 PowerShell 창 열기** (관리자 권한)

2. **Scoop 설치 확인**
```powershell
# Scoop이 없다면 설치
iex (new-object net.webclient).downloadstring('https://get.scoop.sh')
```

3. **Supabase CLI 설치**
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

4. **새 PowerShell 창에서 배포**
```powershell
cd "c:\Users\lcw55\OneDrive\바탕 화면\ai_mice\hokex-front"

# Supabase 로그인
supabase login

# 프로젝트 연결 (프로젝트 참조 ID 필요)
supabase link --project-ref YOUR_PROJECT_REF

# 모든 Function 배포
supabase functions deploy check-stibee-subscriber
supabase functions deploy send-otp-code
supabase functions deploy verify-otp-code
supabase functions deploy stibee-webhook
supabase functions deploy sync-stibee-subscribers
supabase functions deploy unsubscribe-stibee
supabase functions deploy update-visitor-stats-cache
```

### 방법 3: GitHub Actions로 자동 배포

1. **`.github/workflows/deploy-functions.yml` 생성**
2. **GitHub Secrets 설정**:
   - `SUPABASE_ACCESS_TOKEN`
   - `SUPABASE_PROJECT_ID`

## 다음 단계

배포 후:
1. Supabase Dashboard에서 각 Function의 로그 확인
2. Function URL 복사하여 프론트엔드에서 사용
3. 필요한 환경 변수가 모두 설정되었는지 확인

## Function별 용도

| Function | 용도 | 호출 시점 |
|----------|------|-----------|
| check-stibee-subscriber | 이메일이 Stibee 구독자인지 확인 | 로그인 시 |
| send-otp-code | OTP 코드 이메일 발송 | 로그인 요청 시 |
| verify-otp-code | OTP 코드 검증 | 코드 입력 시 |
| stibee-webhook | Stibee 웹훅 처리 | Stibee에서 이벤트 발생 시 |
| sync-stibee-subscribers | Stibee 구독자 동기화 | Cron job (1분마다) |
| unsubscribe-stibee | Stibee 구독 해지 | 사용자가 구독 해지할 때 |
| update-visitor-stats-cache | 방문자 통계 캐시 업데이트 | Cron job |
