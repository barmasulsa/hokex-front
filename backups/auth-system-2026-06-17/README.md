# 인증 시스템 백업 - 2026-06-17

## 백업 내용
이 백업은 매직 링크(Magic Link) 이메일 로그인 시스템에서 기본 비밀번호(123456) 시스템으로 전환하기 전에 생성되었습니다.

## 백업된 파일
1. `LoginPage.tsx.backup` - 로그인 페이지 컴포넌트
2. `AuthContext.tsx.backup` - 인증 컨텍스트
3. `LoginPage.css.backup` - 로그인 페이지 스타일

## 원래 시스템 특징
- 뉴스레터 구독자가 "이메일 링크로 로그인" 버튼을 클릭
- 매직 링크가 이메일로 전송됨
- 사용자가 이메일의 링크를 클릭하면 자동 로그인
- 첫 로그인 후 프로필에서 비밀번호 설정 가능

## 새로운 시스템 계획
- 뉴스레터 구독자에게 자동으로 초기 비밀번호 `123456` 설정
- 이메일 링크 로그인 방식 제거/숨김
- 사용자는 초기 비밀번호로 로그인 후 비밀번호 변경 가능

## 복원 방법
원래 시스템으로 되돌리려면:
```bash
Copy-Item "backups\auth-system-2026-06-17\LoginPage.tsx.backup" "src\pages\LoginPage.tsx"
Copy-Item "backups\auth-system-2026-06-17\AuthContext.tsx.backup" "src\contexts\AuthContext.tsx"
Copy-Item "backups\auth-system-2026-06-17\LoginPage.css.backup" "src\styles\LoginPage.css"
```

## 변경 사유
매직 링크 이메일이 스팸 필터에 차단되는 문제를 해결하기 위해 초기 비밀번호 방식으로 전환합니다.
