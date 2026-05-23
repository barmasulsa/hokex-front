# 구독 해지 기능 배포 가이드

## 개요
사용자가 프로필 페이지에서 구독을 해지할 수 있는 기능을 구현했습니다.

## 구현 내용

### 1. Edge Function: `unsubscribe-stibee`
- **위치**: `supabase/functions/unsubscribe-stibee/index.ts`
- **기능**:
  1. Stibee API를 통해 구독자 목록에서 이메일 제거
  2. Supabase에서 사용자 데이터 삭제:
     - `saved_events` 테이블에서 저장한 행사 삭제
     - `user_profiles` 테이블에서 닉네임 제거
     - Supabase Auth에서 계정 삭제
  3. 자동 로그아웃

### 2. AuthContext 업데이트
- `unsubscribe()` 함수 추가
- Edge Function 호출 및 자동 로그아웃 처리

### 3. UserProfilePage 업데이트
- 구독 해지 버튼 구현
- 2단계 확인 프로세스:
  1. 첫 번째 확인: 구독 해지 시 발생하는 일 상세 안내
  2. 두 번째 확인: 최종 확인

## 배포 단계

### 1. Edge Function 배포

```bash
cd hokex-front

# Edge Function 배포
supabase functions deploy unsubscribe-stibee
```

### 2. 환경 변수 확인

Edge Function이 다음 환경 변수를 사용하는지 확인:
- `STIBEE_API_KEY`: Stibee API 키
- `STIBEE_LIST_ID`: Stibee 리스트 ID
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Key

이미 `sync-stibee-subscribers`와 `check-stibee-subscriber`에서 설정되어 있어야 합니다.

### 3. 프론트엔드 배포

```bash
# 변경사항 커밋
git add -A
git commit -m "feat: 구독 해지 기능 구현

- unsubscribe-stibee Edge Function 추가
- AuthContext에 unsubscribe 함수 추가
- UserProfilePage에 구독 해지 버튼 구현
- 2단계 확인 프로세스 및 자동 로그아웃"

# Vercel에 배포
git push origin main
```

### 4. 테스트

#### 4.1 테스트 계정으로 구독 해지 테스트

1. 테스트 이메일로 로그인
2. 프로필 페이지 접속
3. "구독 해지" 버튼 클릭
4. 2단계 확인 진행
5. 구독 해지 완료 확인:
   - Stibee 대시보드에서 구독자 목록 확인
   - 로그아웃 되었는지 확인
   - 다시 로그인 시도 → "구독자만 이용 가능" 에러 확인

#### 4.2 Supabase에서 데이터 삭제 확인

```sql
-- saved_events 삭제 확인
SELECT * FROM saved_events WHERE user_id = 'USER_ID';

-- user_profiles 닉네임 제거 확인
SELECT * FROM user_profiles WHERE id = 'USER_ID';

-- auth.users에서 계정 삭제 확인
SELECT * FROM auth.users WHERE id = 'USER_ID';
```

## 동작 흐름

```
사용자 "구독 해지" 버튼 클릭
  ↓
첫 번째 확인 대화상자 (상세 안내)
  ↓
두 번째 확인 대화상자 (최종 확인)
  ↓
unsubscribe() 함수 호출
  ↓
unsubscribe-stibee Edge Function 호출
  ↓
1. Stibee API로 구독 해지
2. saved_events 삭제
3. user_profiles 닉네임 제거
4. auth.users 계정 삭제
  ↓
자동 로그아웃
  ↓
홈페이지로 리다이렉트
```

## 주의사항

1. **되돌릴 수 없는 작업**: 구독 해지는 되돌릴 수 없으므로 2단계 확인 프로세스를 거칩니다.

2. **Stibee 동기화**: 구독 해지 후 1분 이내에 `stibee_subscribers` 테이블에서도 자동으로 제거됩니다.

3. **재가입**: 사용자가 다시 구독하려면:
   - Stibee 구독 폼을 통해 다시 구독
   - 새로운 계정으로 로그인 (이전 데이터는 복구 불가)

4. **관리자 계정**: 관리자도 구독 해지 가능하지만, 관리자 권한은 `user_profiles.is_admin` 필드에 저장되어 있으므로 계정 삭제 시 관리자 권한도 함께 삭제됩니다.

## 트러블슈팅

### Edge Function 배포 실패
```bash
# 로그 확인
supabase functions logs unsubscribe-stibee

# 재배포
supabase functions deploy unsubscribe-stibee --no-verify-jwt
```

### Stibee API 에러
- Stibee 대시보드에서 API 키 확인
- 리스트 ID 확인
- API 호출 제한 확인

### 계정 삭제 실패
- Service Role Key 권한 확인
- RLS 정책 확인
- 외래 키 제약 조건 확인

## 완료 체크리스트

- [ ] Edge Function 배포 완료
- [ ] 환경 변수 설정 확인
- [ ] 프론트엔드 배포 완료
- [ ] 테스트 계정으로 구독 해지 테스트 완료
- [ ] Stibee에서 구독자 제거 확인
- [ ] Supabase에서 데이터 삭제 확인
- [ ] 재로그인 차단 확인


---

## 배포 이력

### 2026-05-23: Stibee API 형식 수정 및 재배포

**문제 발견**:
- 사용자가 구독 해지 버튼을 눌렀으나 Stibee에서 구독자가 삭제되지 않음
- 매직 링크 로그인이 여전히 작동함 (이메일 전송됨)

**원인 분석**:
- Stibee API DELETE 요청 형식이 잘못됨
- 기존 코드: `{ subscribers: [{ email }] }` ❌
- 올바른 형식: `[email]` ✅

**수정 내용**:
1. Edge Function에서 Stibee API 호출 형식 변경:
   ```typescript
   // 기존 (잘못된 형식)
   body: JSON.stringify({
     subscribers: [{ email }]
   })
   
   // 수정 (올바른 형식)
   body: JSON.stringify([email])
   ```

2. 404 에러 처리 추가:
   - 이미 Stibee에서 삭제된 경우 404 에러 발생 가능
   - 404는 정상으로 간주하고 계정 삭제 계속 진행

3. 상세한 로깅 추가:
   - Stibee API 응답 상태 코드 로깅
   - 에러 응답 본문 로깅
   - 성공 응답 JSON 로깅

**배포 완료**:
- ✅ Edge Function 배포: `npx supabase functions deploy unsubscribe-stibee`
- ✅ 프론트엔드 배포: GitHub push → Vercel 자동 배포
- ✅ Commit: `Fix: Stibee API DELETE request format for unsubscribe feature`

**테스트 방법**:
1. 로그인한 상태에서 프로필 페이지로 이동
2. 사이드바에서 "구독 해지" 버튼 클릭
3. 2단계 확인 진행
4. 구독 해지 완료 후 자동 로그아웃
5. **Stibee 대시보드에서 구독자 삭제 확인** ← 이제 정상 작동
6. 매직 링크 로그인 시도 → 구독자가 아니므로 로그인 불가

**디버깅 방법**:
- Supabase Dashboard → Functions → unsubscribe-stibee → Logs
- 확인할 로그:
  - `Stibee API response status: 200` (성공)
  - `Stibee unsubscribe response: {...}` (응답 데이터)
  - `Successfully unsubscribed and deleted user: [이메일]`


---

### 2026-05-23 (2차 수정): stibee_subscribers 테이블 삭제 추가

**문제 발견**:
- 구독 해지 후 Stibee에서는 구독자가 삭제되었으나
- 매직 링크로 로그인 시도 시 여전히 로그인 가능
- 홈페이지 접속 및 이용 가능

**원인 분석**:
1. Stibee API로 구독자 삭제 ✅
2. Supabase Auth에서 계정 삭제 ✅
3. **하지만 `stibee_subscribers` 테이블에서는 삭제하지 않음** ❌

**로그인 흐름**:
```
매직 링크 로그인 시도
  ↓
check-stibee-subscriber Edge Function 호출
  ↓
1차 체크: stibee_subscribers 테이블 조회
  ↓
DB에 이메일 존재 → 로그인 허용 ❌ (문제!)
```

**수정 내용**:
`unsubscribe-stibee` Edge Function에 `stibee_subscribers` 테이블 삭제 로직 추가:

```typescript
// stibee_subscribers 테이블에서 삭제 (중요!)
const { error: stibeeSubError } = await supabaseClient
  .from('stibee_subscribers')
  .delete()
  .eq('email', email.toLowerCase().trim());

if (stibeeSubError) {
  console.error('Error deleting from stibee_subscribers:', stibeeSubError);
} else {
  console.log('Successfully deleted from stibee_subscribers table');
}
```

**삭제 순서**:
1. Stibee API로 구독자 삭제
2. **`stibee_subscribers` 테이블에서 삭제** ← 추가됨
3. `saved_events` 테이블에서 삭제
4. `user_profiles` 닉네임 제거
5. Supabase Auth 계정 삭제

**배포 완료**:
- ✅ Edge Function 재배포: `npx supabase functions deploy unsubscribe-stibee`

**테스트 시나리오**:
1. 구독 해지 실행
2. Stibee 대시보드에서 구독자 삭제 확인
3. **DB에서 `stibee_subscribers` 삭제 확인**:
   ```sql
   SELECT * FROM stibee_subscribers WHERE email = '해지한이메일';
   -- 결과: 0 rows (삭제됨)
   ```
4. 매직 링크 로그인 시도
5. **"구독자만 이용 가능" 에러 확인** ← 이제 정상 작동

**핵심 수정**:
- 구독 해지 시 `stibee_subscribers` 테이블에서도 이메일 삭제
- 이제 매직 링크 로그인 시 DB에서 찾을 수 없으므로 Stibee API 직접 조회
- Stibee에서도 삭제되었으므로 로그인 차단됨
