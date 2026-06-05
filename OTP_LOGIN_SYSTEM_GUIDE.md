# OTP 코드 인증 시스템 완벽 가이드

## 🎯 개요

Magic Link 방식의 스팸 필터 문제를 해결하기 위해 **OTP(One-Time Password) 코드 인증 시스템**을 구현했습니다.

### 주요 특징
- ✅ **스팸 필터 통과율 향상**: 단순 텍스트 이메일이라 링크보다 훨씬 안전
- ✅ **빠른 전송**: 링크 생성 없이 6자리 숫자만 전송
- ✅ **사용자 친화적**: 네이버/카카오 등에서 익숙한 방식
- ✅ **보안 우수**: 5분 시간 제한 + 1회용
- ✅ **관리자 승인 연동**: 전송 실패 시 자동으로 대기 명단 추가

---

## 📂 파일 구조

### 1. DB 마이그레이션
```
hokex-front/supabase-migrations/create-otp-verification-system.sql
```
- `email_verification_codes` 테이블 생성
- RLS 정책 설정
- 인덱스 생성
- 자동 정리 함수

### 2. Edge Function
```
hokex-front/supabase/functions/send-otp-code/index.ts
```
- 6자리 랜덤 OTP 코드 생성
- DB에 저장 (5분 만료)
- 이메일 발송 (HTML 템플릿)
- 에러 처리 및 대기 명단 추가

### 3. Frontend
```
hokex-front/src/contexts/AuthContext.tsx
```
- `sendOTPCode()`: OTP 코드 발송
- `verifyOTPCode()`: OTP 코드 검증 및 로그인

```
hokex-front/src/pages/LoginPage.tsx
```
- 2단계 UI: 이메일 입력 → OTP 코드 입력
- 5분 카운트다운 타이머
- 코드 재전송 기능
- 에러 처리

```
hokex-front/src/styles/LoginPage.css
```
- OTP 입력 화면 스타일
- 타이머 애니메이션
- 반응형 디자인

---

## 🚀 배포 순서

### 1단계: Supabase SQL 마이그레이션 실행

```bash
# Supabase Dashboard → SQL Editor에서 실행
# 파일: create-otp-verification-system.sql
```

**실행 내용:**
- `email_verification_codes` 테이블 생성
- RLS 정책 설정 (service_role 권한)
- 인덱스 생성 (성능 향상)
- 만료 코드 정리 함수

**확인:**
```sql
-- 테이블 확인
SELECT * FROM public.email_verification_codes LIMIT 1;

-- RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'email_verification_codes';
```

---

### 2단계: Supabase Edge Function 배포

#### 로컬에서 테스트 (선택 사항)
```bash
cd hokex-front
supabase functions serve send-otp-code --env-file ./supabase/.env.local
```

#### 프로덕션 배포
```bash
# Edge Function 배포
supabase functions deploy send-otp-code

# 환경 변수 설정 (이미 설정되어 있으면 생략)
supabase secrets set SUPABASE_URL=your_supabase_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**확인:**
```bash
# Edge Function 목록 확인
supabase functions list

# 로그 확인
supabase functions logs send-otp-code
```

---

### 3단계: Git 커밋 및 Vercel 배포

```bash
cd c:\Users\lcw55\OneDrive\바탕 화면\ai_mice\hokex-front

# 변경 사항 확인
git status

# 파일 추가
git add supabase-migrations/create-otp-verification-system.sql
git add supabase/functions/send-otp-code/index.ts
git add src/contexts/AuthContext.tsx
git add src/pages/LoginPage.tsx
git add src/styles/LoginPage.css
git add OTP_LOGIN_SYSTEM_GUIDE.md

# 커밋
git commit -m "feat: OTP 코드 인증 시스템 구현

- Magic Link 대체용 OTP 코드 시스템
- 스팸 필터 통과율 향상 (단순 텍스트 이메일)
- 2단계 로그인 UI (이메일 → OTP 입력)
- 5분 만료 타이머 + 코드 재전송 기능
- Edge Function: send-otp-code
- DB: email_verification_codes 테이블"

# GitHub 푸시 (Vercel 자동 배포)
git push origin main
```

---

## 🔍 사용자 플로우

### 1. 이메일 입력 단계

1. 사용자가 "이메일 코드로 로그인" 버튼 클릭
2. 프롬프트에 이메일 입력
3. `sendOTPCode(email)` 호출
   - 구독자 확인 (Stibee API)
   - 승인 이메일 확인 (approved_emails)
   - Edge Function 호출 (send-otp-code)
4. 6자리 OTP 코드가 이메일로 발송됨
5. OTP 입력 화면으로 전환

### 2. OTP 코드 입력 단계

1. 사용자가 이메일에서 받은 6자리 코드 입력
2. `verifyOTPCode(email, code)` 호출
   - DB에서 코드 검증 (만료 확인)
   - Supabase Auth Magic Link 발급 (자동 로그인)
   - 코드 사용 처리 (used_at 업데이트)
3. 로그인 성공 → 홈페이지로 리다이렉트

### 3. 타이머 및 재전송

- **5분 카운트다운 타이머** 표시
- 만료 시: "⏰ 만료됨" 표시 + 인증 버튼 비활성화
- **"코드 재전송"** 버튼: 새로운 코드 발송
- **"뒤로가기"** 버튼: 이메일 입력 단계로 돌아가기

---

## ⚠️ 에러 처리

### 1. EMAIL_BLOCKED (스팸 차단)
```typescript
throw new Error('EMAIL_BLOCKED');
```
- 자동으로 `pending_approvals` 테이블에 추가
- 사용자에게 관리자 승인 안내 메시지 표시

### 2. NEEDS_APPROVAL (미승인)
```typescript
throw new Error('NEEDS_APPROVAL');
```
- 구독자도 아니고 승인도 안 된 경우
- 관리자 승인 요청 안내

### 3. INVALID_OR_EXPIRED_CODE (코드 오류)
```typescript
throw new Error('INVALID_OR_EXPIRED_CODE');
```
- 코드가 틀리거나 만료된 경우
- 재전송 안내

---

## 🔒 보안 기능

### 1. 시간 제한
- **5분 만료**: `expires_at` 컬럼으로 관리
- 만료된 코드는 검증 실패

### 2. 1회용 코드
- `used_at` 컬럼으로 사용 여부 체크
- 한 번 사용한 코드는 재사용 불가

### 3. 무차별 대입 방지
- `attempts` 컬럼으로 시도 횟수 기록
- 필요 시 차단 로직 추가 가능

### 4. 이메일당 1개 코드
- 새 코드 발송 시 기존 미사용 코드 삭제
- DB 중복 방지

### 5. IP 주소 기록
- `ip_address` 컬럼에 요청 IP 저장
- 보안 로그 및 추적용

---

## 📧 이메일 템플릿

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="background-color: #f4f4f5; padding: 40px 20px;">
  <table width="600" style="background-color: #ffffff; border-radius: 12px;">
    <!-- 헤더 (그라디언트 배경) -->
    <tr>
      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px;">
        <h1 style="color: #ffffff; font-size: 32px;">HOKEX</h1>
        <p style="color: rgba(255, 255, 255, 0.95);">전국 전시·컨벤션 정보 플랫폼</p>
      </td>
    </tr>
    
    <!-- 본문 -->
    <tr>
      <td style="padding: 40px 30px;">
        <h2>로그인 인증 코드</h2>
        <p>HOKEX 로그인을 위한 인증 코드입니다.</p>
        
        <!-- OTP 코드 박스 -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; border-radius: 12px;">
          <p style="color: #ffffff; font-size: 48px; letter-spacing: 8px;">123456</p>
        </div>
        
        <!-- 안내 사항 -->
        <div style="background-color: #fef3c7; border: 1px solid #fbbf24; padding: 16px;">
          <p>⏱️ 유효 시간: 5분</p>
          <p>🔒 보안: 이 코드는 타인에게 공유하지 마세요.</p>
        </div>
      </td>
    </tr>
    
    <!-- 푸터 -->
    <tr>
      <td style="background-color: #f9fafb; padding: 24px;">
        <p style="color: #9ca3af; font-size: 12px;">© 2024 HOKEX. All rights reserved.</p>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 🧪 테스트 시나리오

### 1. 정상 플로우
1. ✅ 구독자 이메일로 OTP 코드 요청
2. ✅ 이메일 수신 확인
3. ✅ 6자리 코드 입력 및 로그인 성공

### 2. 에러 케이스
1. ⚠️ 비구독자 이메일 → NEEDS_APPROVAL
2. ⚠️ 스팸 차단 → EMAIL_BLOCKED + pending_approvals 추가
3. ⚠️ 잘못된 코드 입력 → INVALID_OR_EXPIRED_CODE
4. ⚠️ 5분 초과 → 만료 안내

### 3. 재전송 테스트
1. ✅ 코드 재전송 → 기존 코드 무효화
2. ✅ 새 코드로 로그인 성공

---

## 📊 DB 스키마

```sql
CREATE TABLE email_verification_codes (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,            -- 6자리 숫자
  expires_at TIMESTAMPTZ NOT NULL,  -- 생성 시각 + 5분
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ NULL,      -- 사용 시각 (NULL = 미사용)
  ip_address TEXT,                -- 요청 IP
  attempts INTEGER DEFAULT 0      -- 검증 시도 횟수
);
```

**인덱스:**
- `idx_verification_codes_email` (email)
- `idx_verification_codes_code` (code)
- `idx_verification_codes_expires_at` (expires_at)
- `idx_verification_codes_email_code` (email, code)

---

## 🎨 UI 개선 사항

### Before (Magic Link)
- 이메일 링크 클릭 필요
- 스팸 필터에 자주 걸림
- 링크 만료 시 재요청 필요

### After (OTP Code)
- **2단계 UI**: 이메일 → 코드 입력
- **5분 타이머**: 실시간 카운트다운
- **코드 재전송**: 버튼 1클릭으로 즉시 재발송
- **뒤로가기**: 이메일 재입력 가능
- **반응형 디자인**: 모바일 최적화

---

## 🔧 유지보수

### 만료 코드 정리
```sql
-- 수동 실행 (필요 시)
SELECT public.cleanup_expired_verification_codes();

-- 또는 Supabase Cron으로 자동화
```

### 로그 확인
```bash
# Edge Function 로그
supabase functions logs send-otp-code --tail

# DB 로그
SELECT * FROM email_verification_codes ORDER BY created_at DESC LIMIT 10;
```

### 통계 확인
```sql
-- 오늘 발송된 OTP 수
SELECT COUNT(*) FROM email_verification_codes
WHERE created_at >= CURRENT_DATE;

-- 성공률 (used_at IS NOT NULL)
SELECT 
  COUNT(*) FILTER (WHERE used_at IS NOT NULL) * 100.0 / COUNT(*) AS success_rate
FROM email_verification_codes
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';
```

---

## 📞 문의

- **이메일**: hokexpanda@gmail.com
- **관리자 페이지**: `/admin/approvals`

---

## 🎉 결론

OTP 코드 인증 시스템은 **Magic Link의 스팸 필터 문제를 근본적으로 해결**하면서도 **사용자 경험을 개선**한 새로운 로그인 방식입니다.

- ✅ 스팸 통과율 향상
- ✅ 빠른 전송
- ✅ 사용자 친화적
- ✅ 보안 우수
- ✅ 관리자 승인 시스템과 연동

**배포 후 테스트를 반드시 진행하세요!**
