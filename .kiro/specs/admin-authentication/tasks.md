# 관리자 인증 시스템 구현 작업

## Phase 1: DB 설정 (Supabase)

### Task 1.1: user_profiles 테이블 생성
- [ ] SQL 마이그레이션 파일 작성
- [ ] user_profiles 테이블 생성
- [ ] RLS 정책 설정
- [ ] 테스트 관리자 계정 생성

### Task 1.2: events 테이블 RLS 업데이트
- [ ] 기존 RLS 정책 확인
- [ ] 읽기 정책: 모두 허용
- [ ] 쓰기 정책: 관리자만 허용
- [ ] 정책 테스트

## Phase 2: 프론트엔드 인증 구조

### Task 2.1: Supabase 클라이언트 설정
- [ ] @supabase/supabase-js 패키지 설치
- [ ] lib/supabase.ts 생성
- [ ] 환경변수 설정 (.env.local)

### Task 2.2: AuthContext 구현
- [ ] contexts/AuthContext.tsx 생성
- [ ] 로그인/로그아웃 함수
- [ ] 세션 자동 복구
- [ ] is_admin 체크 로직

### Task 2.3: 로그인 페이지
- [ ] pages/LoginPage.tsx 생성
- [ ] components/LoginForm.tsx 생성
- [ ] 로그인 폼 UI
- [ ] 에러 처리

## Phase 3: UI 업데이트

### Task 3.1: App.tsx 수정
- [ ] AuthProvider로 앱 감싸기
- [ ] 관리자 모드 토글 버튼 제거
- [ ] 로그인 상태에 따른 헤더 UI 변경
- [ ] 로그인/로그아웃 버튼 추가

### Task 3.2: HomePage 수정
- [ ] isAdmin prop을 AuthContext에서 가져오기
- [ ] 관리자 알림 메시지 조건부 표시

### Task 3.3: EventCard 수정
- [ ] isAdmin prop을 AuthContext에서 가져오기
- [ ] 수정 기능 권한 체크

## Phase 4: 테스트 및 배포

### Task 4.1: 로컬 테스트
- [ ] 로그인 테스트
- [ ] 관리자 권한 테스트
- [ ] 일반 사용자 권한 테스트
- [ ] 로그아웃 테스트

### Task 4.2: Vercel 배포
- [ ] 환경변수 설정
- [ ] 배포 및 테스트
- [ ] 프로덕션 관리자 계정 생성

## 구현 순서
1. DB 설정 (Supabase SQL Editor)
2. 프론트엔드 인증 구조
3. UI 업데이트
4. 테스트 및 배포

## 예상 소요 시간
- Phase 1: 30분
- Phase 2: 1시간
- Phase 3: 1시간
- Phase 4: 30분
- **총 3시간**
