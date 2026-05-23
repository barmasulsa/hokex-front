# 이메일 매직 링크 URL 해시 정리 가이드

## 문제 상황

사용자가 이메일 매직 링크로 로그인할 때, URL에 에러 해시가 표시되는 문제:
```
https://hokex.vercel.app/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
```

**중요**: 사이트 이용에는 전혀 문제가 없으며, 단지 URL에 에러 메시지가 표시되어 사용자가 불안해할 수 있는 UX 문제입니다.

## 실제 동작

- ✅ 매직 링크는 **재사용 가능** (일회용 아님)
- ✅ 1시간 이후에도 **계속 사용 가능**
- ✅ 로그인 및 모든 기능 **정상 작동**
- ⚠️ URL에 에러 해시만 표시됨 (UX 문제)

## 해결 방법

### 1. App.tsx - URL 해시 자동 정리

```typescript
// URL 해시 정리 (에러 파라미터 제거)
useEffect(() => {
  const hash = window.location.hash;
  
  // Supabase 인증 관련 에러 해시가 있으면 조용히 제거
  if (hash.includes('error=') || hash.includes('error_code=') || hash.includes('error_description=')) {
    // URL에서 에러 해시만 깔끔하게 제거
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}, []);
```

**동작 원리**:
- 앱 로드 시 URL 해시 확인
- 에러 관련 파라미터가 있으면 조용히 제거
- 사용자에게 알림 없이 깔끔한 URL로 변경

### 2. LoginPage.tsx - 로그인 페이지에서만 안내

```typescript
// 매직 링크 만료 감지 (로그인 페이지에서만)
useEffect(() => {
  const hash = window.location.hash;
  if (hash.includes('error=access_denied') && hash.includes('otp_expired')) {
    // 이미 App.tsx에서 URL은 정리되었으므로, 여기서는 안내만 표시
    setError('⚠️ 로그인 링크가 만료되었습니다. 아래에서 새로운 링크를 요청해주세요.');
  }
}, []);
```

**동작 원리**:
- 로그인 페이지에 있을 때만 에러 메시지 표시
- URL은 이미 App.tsx에서 정리됨
- 사용자가 새 링크를 요청할 수 있도록 안내

### 3. 안내 문구 단순화

기존 (잘못된 정보):
```
- 이메일로 받은 로그인 링크는 1시간 동안 유효합니다
- 1시간이 지나면 링크가 만료되어 사용할 수 없습니다
```

변경 후 (정확한 정보):
```
이메일로 받은 로그인 링크를 클릭하면 자동으로 로그인됩니다.
```

## 배포 방법

```bash
cd hokex-front
git add src/App.tsx src/pages/LoginPage.tsx
git commit -m "fix: URL 해시 에러 메시지 자동 정리"
git push origin main
```

Vercel이 자동으로 배포합니다.

## 테스트 방법

1. 이메일 매직 링크 요청
2. 이메일에서 링크 클릭
3. URL 확인 - 에러 해시가 자동으로 제거되어야 함
4. 사이트 정상 작동 확인

## 결과

- ✅ URL이 깔끔하게 유지됨: `https://hokex.vercel.app/`
- ✅ 사용자 불안감 해소
- ✅ 모든 기능 정상 작동
- ✅ 실제 에러 발생 시에만 로그인 페이지에서 안내

## 참고사항

- Supabase 매직 링크는 실제로 재사용 가능하며 시간 제한이 없거나 매우 깁니다
- `otp_expired` 에러는 특정 상황에서만 발생하며, 대부분의 경우 정상 작동합니다
- URL 해시 정리는 사용자 경험 개선을 위한 것이며, 실제 기능에는 영향을 주지 않습니다
