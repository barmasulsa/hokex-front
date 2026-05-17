# 스티비 뉴스레터 구독자 인증 통합 가이드

## 개요
HOKEX는 스티비 뉴스레터 구독자만 이용할 수 있도록 제한되었습니다.

## 스티비 정보
- **API Key**: `52c730f2b04db7709884c860251373efc943ed246be2b1c89b7c15b40201e321a17c5a227662bb24f423699bb5f7b218c198cad81c0c09f4623ed59a94c1c921`
- **List ID**: `289942`

## 배포 단계

### 1. Supabase CLI 설치 (아직 안 했다면)

```bash
npm install -g supabase
```

### 2. Supabase 프로젝트 로그인

```bash
supabase login
```

브라우저에서 Supabase 계정으로 로그인합니다.

### 3. 프로젝트 연결

```bash
cd hokex-front
supabase link --project-ref [YOUR_PROJECT_REF]
```

프로젝트 REF는 Supabase 대시보드 URL에서 확인할 수 있습니다:
`https://supabase.com/dashboard/project/[YOUR_PROJECT_REF]`

### 4. 환경 변수 설정

```bash
supabase secrets set STIBEE_API_KEY=52c730f2b04db7709884c860251373efc943ed246be2b1c89b7c15b40201e321a17c5a227662bb24f423699bb5f7b218c198cad81c0c09f4623ed59a94c1c921
supabase secrets set STIBEE_LIST_ID=289942
```

또는 Supabase 대시보드에서 설정:
1. Settings → Edge Functions → Environment Variables
2. `STIBEE_API_KEY` 추가
3. `STIBEE_LIST_ID` 추가

### 5. Edge Function 배포

```bash
supabase functions deploy check-stibee-subscriber
```

배포 성공 시 Function URL이 표시됩니다:
```
https://[your-project-ref].supabase.co/functions/v1/check-stibee-subscriber
```

### 6. 프론트엔드 배포

```bash
git add .
git commit -m "feat: Add Stibee newsletter subscriber verification"
git push origin main
```

Vercel이 자동으로 배포를 시작합니다.

## 테스트

### 구독자 이메일로 테스트
1. 스티비에 등록된 이메일로 로그인 시도
2. Magic Link 이메일 수신 확인
3. 로그인 성공 확인

### 비구독자 이메일로 테스트
1. 스티비에 없는 이메일로 로그인 시도
2. "뉴스레터 구독자만 이용할 수 있습니다" 메시지 확인

## Edge Function 로그 확인

```bash
supabase functions logs check-stibee-subscriber
```

또는 Supabase 대시보드:
Edge Functions → check-stibee-subscriber → Logs

## 구독 링크

사용자가 뉴스레터를 구독할 수 있는 링크:
https://stibee.com/api/v1.0/lists/289942/public/subscribe

## 문제 해결

### Edge Function이 작동하지 않는 경우
1. 환경 변수가 올바르게 설정되었는지 확인
2. Edge Function 로그 확인
3. Stibee API 키가 유효한지 확인

### 구독자인데 로그인이 안 되는 경우
1. 스티비에서 해당 이메일의 구독 상태 확인 (SUBSCRIBED 상태여야 함)
2. Edge Function 로그에서 API 응답 확인

### CORS 에러가 발생하는 경우
- Edge Function의 CORS 헤더가 올바르게 설정되어 있는지 확인
- 현재 설정: `Access-Control-Allow-Origin: *` (모든 도메인 허용)

## 구현 세부사항

### AuthContext 변경사항
- `checkSubscription()` 함수 추가: Edge Function 호출하여 구독자 확인
- `signInWithMagicLink()` 수정: 구독자 확인 후 Magic Link 전송

### LoginPage 변경사항
- 에러 처리 개선: 비구독자에게 명확한 메시지 표시
- 구독 안내 섹션 추가
- 뉴스레터 구독 링크 추가

### Edge Function
- 스티비 API를 호출하여 이메일 구독 상태 확인
- SUBSCRIBED 상태만 허용
- CORS 지원

## 보안 고려사항

1. **API 키 보안**: 
   - API 키는 Edge Function 환경 변수에만 저장
   - 프론트엔드 코드에 노출되지 않음

2. **구독 상태 검증**:
   - 매 로그인 시도마다 실시간으로 스티비 API 확인
   - 구독 취소 시 즉시 접근 차단

3. **CORS 정책**:
   - 현재는 모든 도메인 허용 (`*`)
   - 프로덕션에서는 특정 도메인으로 제한 권장

## 향후 개선 사항

### 선택사항: 구독자 목록 캐싱
성능 개선을 위해 구독자 목록을 Supabase DB에 캐싱할 수 있습니다:

1. `subscribers` 테이블 생성
2. 주기적으로 스티비 API에서 구독자 목록 동기화
3. 로그인 시 DB에서 확인 (API 호출 감소)

이 기능이 필요하면 별도로 구현할 수 있습니다.
