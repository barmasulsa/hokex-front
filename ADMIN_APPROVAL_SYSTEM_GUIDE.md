# 관리자 수동 승인 시스템 구현 완료

## 📋 개요

이메일 로그인 링크가 스팸으로 차단되는 문제를 해결하기 위해 **관리자 수동 승인 시스템**을 구현했습니다.

### 핵심 기능
1. **자동 대기 명단 추가**: 이메일 전송 실패 시 자동으로 `pending_approvals` 테이블에 추가
2. **관리자 승인 페이지**: 관리자가 대기 중인 사용자를 확인하고 승인 가능
3. **승인된 이메일 관리**: `approved_emails` 테이블에서 승인된 사용자 관리
4. **승인된 사용자 로그인**: 스티비 구독자가 아니어도 승인된 이메일은 로그인 가능

---

## 🗄️ 데이터베이스 설정

### 1. SQL 마이그레이션 실행

Supabase SQL Editor에서 다음 파일 실행:

```
supabase-migrations/create-approval-system.sql
```

이 SQL 파일은:
- `approved_emails` 테이블 생성 (승인된 이메일 목록)
- `pending_approvals` 테이블 생성 (대기 중인 승인 요청)
- RLS 정책 설정 (관리자만 읽기/쓰기 가능)
- 인덱스 생성 (성능 향상)

### 2. 테이블 구조

#### `approved_emails` 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | Primary Key |
| email | TEXT | 승인된 이메일 주소 (UNIQUE) |
| approved_by | UUID | 승인한 관리자 user_id |
| approved_at | TIMESTAMPTZ | 승인 일시 |
| notes | TEXT | 승인 시 관리자 메모 |
| created_at | TIMESTAMPTZ | 생성 일시 |

#### `pending_approvals` 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | Primary Key |
| email | TEXT | 대기 중인 이메일 주소 (UNIQUE) |
| reason | TEXT | 대기 명단 추가 이유 (EMAIL_BLOCKED, SPAM_FILTER 등) |
| error_message | TEXT | 발생한 에러 메시지 |
| request_count | INTEGER | 로그인 시도 횟수 |
| first_requested_at | TIMESTAMPTZ | 첫 시도 일시 |
| last_requested_at | TIMESTAMPTZ | 마지막 시도 일시 |
| created_at | TIMESTAMPTZ | 생성 일시 |

---

## 🔄 작동 흐름

### 시나리오 1: 스팸 차단된 사용자

1. **사용자**: 로그인 페이지에서 "이메일 링크로 로그인" 클릭
2. **시스템**: 이메일 전송 시도
3. **에러 발생**: 553 Blocked Using Spam Pattern 또는 rate limit
4. **자동 처리**: 
   - `pending_approvals` 테이블에 자동 추가
   - 사용자에게 "승인 요청이 전달되었습니다" 안내
5. **관리자**: `/admin/approvals` 페이지에서 대기 중인 요청 확인
6. **승인**: 관리자가 "승인" 버튼 클릭
7. **결과**:
   - `approved_emails` 테이블에 추가
   - `pending_approvals` 테이블에서 제거
8. **사용자 재시도**: 승인 후 비밀번호 로그인 사용 가능

### 시나리오 2: 승인된 사용자의 로그인

1. **사용자**: 로그인 페이지에서 이메일/비밀번호 입력
2. **시스템**: 
   - 먼저 스티비 구독자인지 확인
   - 구독자가 아니면 `approved_emails`에서 확인
   - 승인된 이메일이면 로그인 허용
3. **결과**: 정상적으로 로그인 완료

---

## 🎨 UI 구성

### 관리자 승인 페이지 (`/admin/approvals`)

#### 대기 중인 승인 요청 섹션
- 이메일 주소
- 차단 이유 (EMAIL_BLOCKED, RATE_LIMIT, SPAM_FILTER 등)
- 시도 횟수
- 첫 시도 일시 / 마지막 시도 일시
- 에러 메시지
- 액션: "✅ 승인" 버튼, "❌ 제거" 버튼

#### 승인된 이메일 섹션
- 이메일 주소
- 승인 일시
- 관리자 메모
- 액션: "🗑️ 승인 취소" 버튼

---

## 💻 코드 구조

### 수정된 파일

1. **`src/contexts/AuthContext.tsx`**
   - `checkApprovedEmail()`: 승인된 이메일인지 확인
   - `addToPendingList()`: 대기 명단에 자동 추가
   - `signInWithPassword()`: 승인된 이메일도 로그인 허용
   - `signInWithMagicLink()`: 이메일 전송 실패 시 자동으로 대기 명단 추가

2. **`src/pages/LoginPage.tsx`**
   - `NEEDS_APPROVAL` 에러 처리 추가
   - `EMAIL_BLOCKED` 에러 처리 추가
   - 사용자에게 승인 요청 안내

3. **`src/App.tsx`**
   - `AdminApprovalPage` import 추가
   - `/admin/approvals` 라우트 추가
   - 헤더에 "🔐 승인 관리" 링크 추가 (관리자만)

### 새로 생성된 파일

1. **`src/pages/AdminApprovalPage.tsx`**
   - 관리자 승인 페이지 컴포넌트
   - 대기 중인 요청 목록 표시
   - 승인된 이메일 목록 표시
   - 승인/제거 기능 구현

2. **`src/styles/AdminApprovalPage.css`**
   - 승인 페이지 전용 스타일
   - 반응형 디자인 지원

3. **`supabase-migrations/create-approval-system.sql`**
   - 테이블 생성 SQL
   - RLS 정책 설정
   - 인덱스 생성

---

## 🚀 배포 순서

### 1. 데이터베이스 마이그레이션

Supabase 대시보드 → SQL Editor:

```sql
-- create-approval-system.sql 파일 내용 복사하여 실행
```

### 2. 코드 배포

```bash
# 변경사항 커밋
git add .
git commit -m "feat: 관리자 수동 승인 시스템 구현

- 이메일 스팸 차단 문제 해결
- 자동 대기 명단 추가
- 관리자 승인 페이지 구현"

# main 브랜치에 푸시 (Vercel 자동 배포)
git push origin main
```

### 3. 배포 확인

1. Vercel 배포 완료 대기
2. 관리자 계정으로 로그인
3. `/admin/approvals` 페이지 접속 확인
4. 테스트 이메일로 승인 플로우 테스트

---

## 🧪 테스트 시나리오

### 테스트 1: 스팸 차단 시뮬레이션

1. 스팸으로 차단될 이메일 주소 준비 (예: 회사 이메일)
2. 로그인 페이지에서 "이메일 링크로 로그인" 시도
3. 에러 발생 확인
4. 관리자 페이지에서 `pending_approvals`에 추가 확인
5. 승인 처리
6. 비밀번호 설정 후 로그인 테스트

### 테스트 2: 승인된 이메일 로그인

1. `approved_emails`에 테스트 이메일 추가
2. 해당 이메일로 비밀번호 로그인 시도
3. 스티비 구독자가 아니어도 로그인 성공 확인

### 테스트 3: 승인 취소

1. 승인된 이메일 선택
2. "승인 취소" 버튼 클릭
3. 해당 이메일로 로그인 시도
4. `NEEDS_APPROVAL` 에러 발생 확인

---

## 📊 에러 코드 정리

| 에러 코드 | 의미 | 처리 방법 |
|-----------|------|-----------|
| `NEEDS_APPROVAL` | 승인이 필요한 계정 | 관리자에게 승인 요청 안내 |
| `EMAIL_BLOCKED` | 이메일 전송 차단됨 | 자동으로 대기 명단 추가 + 안내 |
| `SUBSCRIBER_ONLY` | 스티비 구독자만 허용 | 구독 링크 안내 |
| `RATE_LIMIT` | 이메일 전송 제한 | 비밀번호 로그인 권장 |

---

## 🔧 관리자 가이드

### 승인 처리 절차

1. `/admin/approvals` 페이지 접속
2. "⏳ 대기 중인 승인 요청" 섹션 확인
3. 각 요청의 이메일 주소, 시도 횟수, 에러 메시지 확인
4. 승인할 이메일 선택 → "✅ 승인" 버튼 클릭
5. 메모 입력 (선택사항)
6. 승인 완료 확인

### 승인 취소

1. "✅ 승인된 이메일" 섹션에서 해당 이메일 찾기
2. "🗑️ 승인 취소" 버튼 클릭
3. 확인 대화상자에서 "확인" 클릭
4. 해당 사용자는 다시 승인이 필요함

### 대기 목록 관리

- **제거**: 잘못된 요청이나 스팸으로 의심되는 경우 "❌ 제거" 버튼 사용
- **시도 횟수 확인**: `request_count`가 높은 경우 긴급성 판단
- **에러 메시지 분석**: 스팸 차단인지 rate limit인지 확인

---

## 🔍 트러블슈팅

### 문제: 대기 명단에 자동으로 추가되지 않음

**원인**: RLS 정책 문제
**해결책**: 
```sql
-- Service role이 INSERT/UPDATE 가능한지 확인
SELECT * FROM pg_policies WHERE tablename = 'pending_approvals';
```

### 문제: 승인했는데도 로그인 안 됨

**원인**: `approved_emails` 테이블 조회 권한 문제
**해결책**:
```sql
-- RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'approved_emails';
```

### 문제: 관리자 페이지가 빈 화면

**원인**: 관리자 권한 체크 실패
**해결책**:
- `user_profiles` 테이블에서 `is_admin = true` 확인
- 관리자 모드 토글 버튼 클릭 (✏️)

---

## 📝 TODO (향후 개선 사항)

- [ ] 승인 시 사용자에게 이메일 알림 발송
- [ ] 대기 명단 자동 만료 (예: 30일 후 자동 삭제)
- [ ] 승인 통계 대시보드 (일일/월별 승인 수)
- [ ] 승인 이유 템플릿 (자주 사용하는 메모)
- [ ] 벌크 승인 기능 (여러 이메일 한 번에 승인)

---

## 📞 문의

문제 발생 시: hokexpanda@gmail.com
