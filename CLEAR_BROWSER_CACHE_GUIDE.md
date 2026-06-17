# 브라우저 캐시 완전 삭제 가이드

## 문제 상황
- Production (Vercel)에서 이전 버전의 JavaScript가 캐시되어 `approved_emails` 테이블을 계속 참조
- 코드는 업데이트되었지만 브라우저가 이전 파일을 사용 중

## 해결 방법

### 1️⃣ 하드 리프레시 (가장 빠른 방법)

#### Windows/Linux:
```
Ctrl + Shift + R
또는
Ctrl + F5
```

#### Mac:
```
Cmd + Shift + R
또는
Shift + 새로고침 버튼 클릭
```

### 2️⃣ 브라우저 캐시 완전 삭제

#### Chrome:
1. `F12` 또는 `Ctrl + Shift + I` (개발자 도구 열기)
2. 개발자 도구에서 **Network** 탭 선택
3. **Disable cache** 체크박스 활성화
4. 페이지 새로고침 (`F5` 또는 `Ctrl + R`)

또는

1. 주소창에 `chrome://settings/clearBrowserData` 입력
2. **시간 범위**: "전체 기간"
3. 체크 항목:
   - ✅ 쿠키 및 기타 사이트 데이터
   - ✅ 캐시된 이미지 및 파일
4. **데이터 삭제** 클릭

#### Firefox:
1. `Ctrl + Shift + Delete`
2. 시간 범위: "전체"
3. 체크 항목:
   - ✅ 쿠키
   - ✅ 캐시
4. **지금 삭제** 클릭

#### Edge:
1. `Ctrl + Shift + Delete`
2. 시간 범위: "모든 시간"
3. 체크 항목:
   - ✅ 쿠키 및 기타 사이트 데이터
   - ✅ 캐시된 이미지 및 파일
4. **지금 삭제** 클릭

### 3️⃣ 시크릿 모드 테스트
```
Ctrl + Shift + N (Chrome/Edge)
Ctrl + Shift + P (Firefox)
```
- 시크릿 모드는 캐시를 사용하지 않으므로 최신 코드를 확실히 테스트 가능

### 4️⃣ Vercel 배포 확인
```bash
# 최신 배포 확인
vercel ls

# 특정 배포로 접속
https://your-project-xxxxx.vercel.app
```

## 로그인 문제 해결

### 비밀번호 로그인 실패 시:
1. **정확한 이메일 확인**: `sadpandadayo@gmail.com`
2. **비밀번호 확인**: Supabase에 설정된 비밀번호와 일치해야 함
3. **구독자 확인**: Stibee 구독자 명단에 있어야 함

### 비밀번호를 모를 경우:
```sql
-- Supabase SQL Editor에서 실행
-- 새 비밀번호 설정 (예: "test1234")
UPDATE auth.users 
SET 
  encrypted_password = crypt('test1234', gen_salt('bf')),
  updated_at = now()
WHERE email = 'sadpandadayo@gmail.com';
```

### Stibee 구독자 확인:
```sql
-- 1. user_profiles 테이블 확인
SELECT * FROM user_profiles 
WHERE email = 'sadpandadayo@gmail.com';

-- 2. Stibee API 동기화 (1시간마다 자동 실행됨)
-- 즉시 동기화하려면:
SELECT cron.schedule_job('immediate-sync-stibee', '* * * * *', 'select net.http_post(...');
```

## 확인 방법

### 1. 개발자 도구 Network 탭
1. `F12` 눌러 개발자 도구 열기
2. **Network** 탭 선택
3. 페이지 새로고침
4. `index-*.js` 파일들의 **Size** 컬럼 확인
   - `(disk cache)` 또는 `(memory cache)`: 캐시된 버전 ❌
   - 실제 크기 (예: `234 KB`): 서버에서 새로 다운로드 ✅

### 2. Console 로그 확인
1. `F12` 눌러 개발자 도구 열기
2. **Console** 탭 선택
3. 로그인 시도 시 에러 메시지 확인:
   - ❌ `"Failed to load resource: 406"` + `approved_emails` → 이전 버전
   - ✅ `"SUBSCRIBER_ONLY"` 또는 `"Invalid login credentials"` → 최신 버전

## 테스트 계정

### 테스트용 계정 생성:
```sql
-- 1. 테스트 이메일을 Stibee 구독자로 추가 (Stibee 대시보드에서)
-- 2. Supabase에 계정 생성
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@example.com',
  crypt('test1234', gen_salt('bf')),
  now(),
  now(),
  now()
);
```

## 추가 팁

### Vercel 강제 재배포:
```bash
# 코드 변경 없이 강제 재배포
vercel --prod --force
```

### Service Worker 확인 (PWA인 경우):
1. 개발자 도구 → **Application** 탭
2. **Service Workers** 확인
3. **Unregister** 클릭 (있는 경우)

## 최종 체크리스트

- [ ] 하드 리프레시 시도 (`Ctrl + Shift + R`)
- [ ] 브라우저 캐시 완전 삭제
- [ ] 시크릿 모드에서 테스트
- [ ] Console에서 `approved_emails` 에러 사라졌는지 확인
- [ ] 올바른 비밀번호로 로그인 시도
- [ ] Stibee 구독자 명단 확인

## 문제가 계속되면

1. **다른 브라우저에서 테스트** (Chrome → Firefox)
2. **모바일 브라우저에서 테스트**
3. **Vercel 배포 로그 확인**:
   ```
   vercel logs [deployment-url] --follow
   ```
