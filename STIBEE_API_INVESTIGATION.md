# Stibee API 조사 결과 및 해결

## ✅ 해결 완료 (2026-05-18)

### 문제점
- **v1 API 엔드포인트가 404 반환**: `GET https://api.stibee.com/v1/lists/{LIST_ID}/subscribers/{EMAIL}`
- v1 API는 더 이상 지원되지 않거나 구독자 조회 엔드포인트가 존재하지 않음

### 해결 방법
**Stibee API v2로 마이그레이션 완료**

```typescript
// 변경 전 (v1 - 404 에러)
GET https://api.stibee.com/v1/lists/{LIST_ID}/subscribers/{EMAIL}
Headers: AccessToken, Content-Type

// 변경 후 (v2 - 정상 작동)
GET https://api.stibee.com/v2/lists/{LIST_ID}/subscribers
Headers: AccessToken (Content-Type 제거)
```

### 구현 방식
1. **전체 구독자 목록 조회**: v2 API로 전체 구독자 리스트 가져오기
2. **이메일 필터링**: 클라이언트 측에서 이메일로 구독자 검색 (대소문자 구분 없음)
3. **상태 확인**: `SUBSCRIBED`, `subscribed`, `ACTIVE`, `active`, `구독 중` 등 다양한 상태 지원

### 변경 사항
- ✅ `hokex-front/supabase/functions/check-stibee-subscriber/index.ts` 업데이트
- ✅ 개발 우회 코드 제거 (실제 API 사용)
- ✅ v2 API 엔드포인트로 변경
- ✅ Content-Type 헤더 제거 (v2에서는 AccessToken만 필요)
- ✅ 응답 구조 변경 대응 (subscribers 배열 처리)

### 배포 방법
```bash
# Supabase CLI로 Edge Function 배포
cd hokex-front
supabase functions deploy check-stibee-subscriber
```

또는 Supabase Dashboard에서:
1. Edge Functions 섹션 이동
2. `check-stibee-subscriber` 선택
3. 코드 복사/붙여넣기
4. Deploy 클릭

### 성능 고려사항
- **현재**: 매 로그인 시 전체 구독자 목록 조회 (구독자 수가 적으면 문제 없음)
- **향후 최적화** (구독자 수가 많아지면):
  1. **캐싱**: Edge Function에서 구독자 목록 캐싱 (5-10분)
  2. **DB 동기화**: Supabase DB에 구독자 목록 저장 후 주기적 동기화
  3. **Webhook**: Stibee 구독/구독취소 시 실시간 DB 업데이트

### 테스트 방법
1. `lcw5525@naver.com`으로 로그인 시도
2. Edge Function 로그 확인:
   - "Stibee API v2 response status: 200"
   - "Total subscribers in list: X"
   - "Subscriber found - Email: lcw5525@naver.com, Status: 구독 중"
3. 로그인 성공 확인

---

## 이전 조사 내용

### Base URL
- **v2 API**: `https://api.stibee.com/v2` ✅ 사용 중
- **v1 API**: `https://api.stibee.com/v1` ❌ 더 이상 사용 안 함

### 인증
- Header: `AccessToken: YOUR_API_KEY`
- 2025년 1월 21일 이후 생성된 API 키만 사용 가능
