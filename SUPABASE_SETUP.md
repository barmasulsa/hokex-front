# HOKEX Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com) 접속 및 로그인
2. "New Project" 클릭
3. 프로젝트 이름: `hokex-platform`
4. Database Password 설정 (안전하게 보관!)
5. Region: `Northeast Asia (Seoul)` 선택
6. "Create new project" 클릭

## 2. 데이터베이스 스키마 생성

1. Supabase 대시보드에서 **SQL Editor** 메뉴 선택
2. "New query" 클릭
3. `supabase-schema.sql` 파일의 내용을 복사하여 붙여넣기
4. "Run" 버튼 클릭하여 실행

## 3. 환경 변수 설정

1. Supabase 대시보드에서 **Settings** > **API** 메뉴 선택
2. 다음 정보 복사:
   - `Project URL` (VITE_SUPABASE_URL)
   - `anon public` key (VITE_SUPABASE_ANON_KEY)

3. 프로젝트 루트에 `.env` 파일 생성:

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 4. Storage 설정 (이미지 업로드용)

1. Supabase 대시보드에서 **Storage** 메뉴 선택
2. "Create a new bucket" 클릭
3. Bucket 이름: `event-posters`
4. Public bucket 체크 (포스터 이미지는 공개)
5. "Create bucket" 클릭

### Storage Policy 설정:

```sql
-- 모든 사용자가 이미지 읽기 가능
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-posters');

-- 인증된 사용자만 이미지 업로드 가능
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-posters' 
  AND auth.role() = 'authenticated'
);
```

## 5. 인증 설정

1. Supabase 대시보드에서 **Authentication** > **Providers** 메뉤 선택
2. Email provider 활성화 (기본적으로 활성화되어 있음)
3. (선택) 소셜 로그인 추가:
   - Google
   - Kakao
   - Naver

## 6. 테스트

개발 서버 실행:

```bash
npm run dev
```

브라우저에서 확인:
- http://localhost:5173

## 7. 중복 행사 제거 (필요시)

같은 제목과 날짜를 가진 중복 행사가 있다면 제거해야 합니다:

1. Supabase 대시보드에서 **SQL Editor** 메뉴 선택
2. `fix-duplicates.sql` 파일의 내용을 복사하여 붙여넣기
3. 각 단계별로 실행:
   - 1단계: 중복 확인 (SELECT 쿼리)
   - 2단계: 중복 삭제 (DELETE 쿼리)
   - 3단계: 유니크 인덱스 추가
   - 4단계: 결과 확인

**주의**: 2단계 DELETE 쿼리는 실행 후 되돌릴 수 없으므로 신중하게 실행하세요.

## 8. API 사용 예시

### 행사 목록 가져오기
```typescript
import { fetchEvents } from './services/eventService';

const events = await fetchEvents();
```

### 행사 저장하기
```typescript
import { saveEvent } from './services/eventService';

await saveEvent(userId, eventId);
```

### 사용자 로그인
```typescript
import { signIn } from './services/authService';

const { user, error } = await signIn('user@example.com', 'password');
```

## 9. 보안 체크리스트

- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] RLS (Row Level Security) 정책이 활성화되어 있는지 확인
- [ ] API keys가 코드에 하드코딩되지 않았는지 확인
- [ ] Production 배포 시 환경 변수 설정 확인

## 10. 다음 단계

1. HomePage에서 `mockEvents` 대신 `fetchEvents()` 사용
2. 사용자 인증 UI 구현 (로그인/회원가입)
3. 행사 저장 기능을 Supabase와 연동
4. 관리자 모드에서 행사 수정 시 Supabase 업데이트
5. 이미지 업로드 기능 구현

## 문제 해결

### CORS 에러
- Supabase 대시보드에서 **Settings** > **API** > **CORS** 설정 확인
- `http://localhost:5173` 추가

### 인증 에러
- Email confirmation 설정 확인
- **Authentication** > **Settings** > **Email Auth** 확인

### 데이터 조회 안됨
- RLS 정책 확인
- SQL Editor에서 직접 쿼리 테스트

## 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
