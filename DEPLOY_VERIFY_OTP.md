# verify-otp-code Edge Function 배포 가이드

## 문제 상황
- OTP 코드 검증 시 "코드가 유효하지 않거나 만료되었습니다" 오류 발생
- `verify-otp-code` 함수의 검증 로직 버그 수정 완료
- 수정된 함수를 배포해야 함

## 배포 방법

### 옵션 1: PowerShell 재시작 후 배포
1. **새 PowerShell 창을 열기** (현재 창 닫고 다시 열기)
2. 프로젝트 디렉토리로 이동:
   ```powershell
   cd "c:\Users\lcw55\OneDrive\바탕 화면\ai_mice\hokex-front"
   ```
3. Supabase 로그인 (처음 한 번만):
   ```powershell
   supabase login
   ```
4. Edge Function 배포:
   ```powershell
   supabase functions deploy verify-otp-code
   ```

### 옵션 2: Supabase Dashboard에서 수동 배포
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택
3. 좌측 메뉴에서 **Edge Functions** 클릭
4. `verify-otp-code` 함수 찾기
5. 함수 코드를 아래 파일 내용으로 교체:
   - 파일: `supabase\functions\verify-otp-code\index.ts`

## 수정된 핵심 로직

**이전 (버그):**
```typescript
// ❌ verificationData가 null일 때 접근 시도 → 에러
if (verificationData.is_used) {
  return new Response(...)
}
```

**수정 후:**
```typescript
// ✅ 순차적 검증
// 1. 코드 존재 여부 확인
if (!verificationData) {
  return new Response(
    JSON.stringify({ 
      success: false, 
      message: '코드가 유효하지 않거나 만료되었습니다.' 
    }),
    { status: 400 }
  );
}

// 2. 사용 여부 확인
if (verificationData.is_used) {
  return new Response(
    JSON.stringify({ 
      success: false, 
      message: '이미 사용된 인증 코드입니다.' 
    }),
    { status: 400 }
  );
}

// 3. 만료 여부 확인
if (new Date() > new Date(verificationData.expires_at)) {
  return new Response(
    JSON.stringify({ 
      success: false, 
      message: '인증 코드가 만료되었습니다. 새로운 코드를 요청해주세요.' 
    }),
    { status: 400 }
  );
}
```

## 배포 후 테스트

1. 프론트엔드에서 OTP 이메일 요청
2. 이메일로 받은 6자리 코드 입력
3. 정상적으로 인증 완료되는지 확인

## 참고사항

- **현재 테스트 환경**: `onboarding@resend.dev` (Resend 무료 플랜)
- **프로덕션 배포 전**: 도메인 인증 후 `from: 'HOKEX <noreply@hokex.kr>'`로 변경
- **Resend 무료 플랜**: 월 3,000통 무료
- **도메인 인증**: 완전 무료 (DNS 레코드 추가만 필요)

## 관련 파일
- Edge Function: `supabase\functions\verify-otp-code\index.ts`
- 이메일 발송: `supabase\functions\send-otp-code\index.ts`
- DB 마이그레이션: `supabase-migrations\create-otp-verification-system.sql`
