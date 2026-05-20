# Analytics 및 검색엔진 최적화 설정 가이드

## 개요
Google Analytics, Google Search Console, 네이버 Search Adviser를 설정하여 웹사이트 트래픽 분석 및 검색엔진 최적화를 진행합니다.

---

## 1단계: Google Analytics 4 설정

### 1-1. GA4 계정 생성 및 측정 ID 발급

1. **Google Analytics 접속**
   - https://analytics.google.com/ 접속
   - Google 계정으로 로그인

2. **속성 만들기**
   - 왼쪽 하단 "관리" 클릭
   - "속성 만들기" 클릭
   - 속성 이름: `HOKEX`
   - 시간대: `대한민국`
   - 통화: `대한민국 원 (₩)`

3. **데이터 스트림 설정**
   - "웹" 선택
   - 웹사이트 URL: `https://your-domain.vercel.app` (실제 도메인 입력)
   - 스트림 이름: `HOKEX Web`
   - "스트림 만들기" 클릭

4. **측정 ID 복사**
   - 생성된 스트림에서 **측정 ID** 확인 (형식: `G-XXXXXXXXXX`)
   - 예시: `G-ABC123DEF4`

### 1-2. 프론트엔드에 측정 ID 적용

`hokex-front/index.html` 파일 수정:

```html
<!-- 현재 코드 (12번째 줄) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>

<!-- 수정 후 (실제 측정 ID로 교체) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123DEF4"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-ABC123DEF4');
</script>
```

**⚠️ 중요**: `G-XXXXXXXXXX` 두 곳 모두 실제 측정 ID로 교체해야 합니다.

### 1-3. 배포 및 테스트

```bash
cd hokex-front
npm run build
git add index.html
git commit -m "feat: Google Analytics 4 추가"
git push
```

**테스트 방법**:
1. 배포된 사이트 접속
2. 브라우저 개발자 도구 → Network 탭
3. `gtag/js` 요청 확인
4. Google Analytics → 실시간 보고서에서 접속 확인 (1~2분 소요)

---

## 2단계: Google Search Console 설정

### 2-1. Search Console 등록

1. **Google Search Console 접속**
   - https://search.google.com/search-console 접속
   - Google 계정으로 로그인

2. **속성 추가**
   - "속성 추가" 클릭
   - **URL 접두어** 선택
   - URL 입력: `https://your-domain.vercel.app` (실제 도메인)

3. **소유권 확인 - HTML 태그 방식**
   - "HTML 태그" 선택
   - 메타 태그 복사 (형식: `<meta name="google-site-verification" content="abc123...">`)
   - **content 값만 복사** (예: `abc123def456ghi789`)

### 2-2. 프론트엔드에 확인 코드 적용

`hokex-front/index.html` 파일 수정:

```html
<!-- 현재 코드 (20번째 줄) -->
<meta name="google-site-verification" content="YOUR_VERIFICATION_CODE_HERE" />

<!-- 수정 후 (실제 확인 코드로 교체) -->
<meta name="google-site-verification" content="abc123def456ghi789" />
```

### 2-3. 배포 및 확인

```bash
cd hokex-front
npm run build
git add index.html
git commit -m "feat: Google Search Console 소유권 확인 추가"
git push
```

**확인 방법**:
1. 배포 완료 후 (약 1~2분)
2. Google Search Console로 돌아가기
3. "확인" 버튼 클릭
4. "소유권이 확인되었습니다" 메시지 확인

### 2-4. Sitemap 제출 (선택사항)

```bash
# Sitemap URL 제출
https://your-domain.vercel.app/sitemap.xml
```

---

## 3단계: 네이버 Search Adviser 설정

### 3-1. Search Adviser 등록

1. **네이버 서치어드바이저 접속**
   - https://searchadvisor.naver.com/ 접속
   - 네이버 계정으로 로그인

2. **웹마스터 도구 - 사이트 등록**
   - "웹마스터 도구" 클릭
   - "사이트 추가" 클릭
   - URL 입력: `https://your-domain.vercel.app` (실제 도메인)

3. **소유권 확인 - HTML 태그 방식**
   - "HTML 태그" 선택
   - 메타 태그 복사 (형식: `<meta name="naver-site-verification" content="xyz789...">`)
   - **content 값만 복사** (예: `xyz789abc123def456`)

### 3-2. 프론트엔드에 확인 코드 적용

`hokex-front/index.html` 파일 수정:

```html
<!-- 현재 코드 (24번째 줄) -->
<meta name="naver-site-verification" content="YOUR_NAVER_VERIFICATION_CODE_HERE" />

<!-- 수정 후 (실제 확인 코드로 교체) -->
<meta name="naver-site-verification" content="xyz789abc123def456" />
```

### 3-3. 배포 및 확인

```bash
cd hokex-front
npm run build
git add index.html
git commit -m "feat: 네이버 Search Adviser 소유권 확인 추가"
git push
```

**확인 방법**:
1. 배포 완료 후 (약 1~2분)
2. 네이버 서치어드바이저로 돌아가기
3. "소유 확인" 버튼 클릭
4. "소유권이 확인되었습니다" 메시지 확인

### 3-4. Sitemap 제출 (선택사항)

```bash
# 요청 → 사이트맵 제출
https://your-domain.vercel.app/sitemap.xml
```

---

## 4단계: Stibee 웹훅 설정 (실시간 구독자 동기화)

### 4-1. Edge Function 배포

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard 로그인
   - 프로젝트 선택

2. **Edge Function 생성**
   - 왼쪽 메뉴 → "Edge Functions" 클릭
   - "Create a new function" 클릭
   - Function name: `stibee-webhook`
   - `hokex-front/supabase/functions/stibee-webhook/index.ts` 내용 복사하여 붙여넣기
   - "Deploy" 클릭

3. **웹훅 URL 확인**
   ```
   https://[YOUR-PROJECT-ID].supabase.co/functions/v1/stibee-webhook
   ```
   - 예시: `https://abcdefghijklmnop.supabase.co/functions/v1/stibee-webhook`

### 4-2. Stibee 웹훅 설정

1. **Stibee 대시보드 접속**
   - https://stibee.com/ 로그인
   - 주소록 선택

2. **웹훅 추가**
   - 설정 → 웹훅 (Webhook) 메뉴
   - "웹훅 추가" 클릭
   - **웹훅 URL**: `https://[YOUR-PROJECT-ID].supabase.co/functions/v1/stibee-webhook`
   - **이벤트 선택**:
     - ✅ 구독 (subscribe/SUBSCRIBED)
     - ✅ 구독 취소 (unsubscribe/UNSUBSCRIBED)
   - **HTTP 메서드**: POST
   - **Content-Type**: application/json
   - "저장" 클릭

3. **테스트**
   - Stibee에서 테스트 이메일 추가
   - Supabase Dashboard → Edge Functions → Logs 확인
   - DB에서 확인:
     ```sql
     SELECT * FROM stibee_subscribers ORDER BY subscribed_at DESC LIMIT 10;
     ```

---

## 최종 체크리스트

### ✅ Google Analytics 4
- [ ] GA4 계정 생성 완료
- [ ] 측정 ID 발급 완료 (G-XXXXXXXXXX)
- [ ] `index.html`에 측정 ID 적용 완료
- [ ] 배포 완료
- [ ] 실시간 보고서에서 접속 확인 완료

### ✅ Google Search Console
- [ ] Search Console 속성 추가 완료
- [ ] 확인 코드 발급 완료
- [ ] `index.html`에 확인 코드 적용 완료
- [ ] 배포 완료
- [ ] 소유권 확인 완료
- [ ] Sitemap 제출 완료 (선택사항)

### ✅ 네이버 Search Adviser
- [ ] Search Adviser 사이트 등록 완료
- [ ] 확인 코드 발급 완료
- [ ] `index.html`에 확인 코드 적용 완료
- [ ] 배포 완료
- [ ] 소유권 확인 완료
- [ ] Sitemap 제출 완료 (선택사항)

### ✅ Stibee 웹훅
- [ ] Edge Function 배포 완료
- [ ] 웹훅 URL 확인 완료
- [ ] Stibee에서 웹훅 설정 완료
- [ ] 테스트 구독자로 검증 완료

---

## 문제 해결

### Q: Google Analytics에서 데이터가 보이지 않습니다

1. 측정 ID가 두 곳 모두 정확히 입력되었는지 확인
2. 브라우저 개발자 도구 → Network 탭에서 `gtag/js` 요청 확인
3. 광고 차단 프로그램 비활성화 후 테스트
4. 실시간 보고서는 1~2분 지연될 수 있음

### Q: Search Console 소유권 확인이 실패합니다

1. 확인 코드가 정확히 입력되었는지 확인 (따옴표 제외)
2. 배포가 완료되었는지 확인 (Vercel 대시보드)
3. 브라우저에서 페이지 소스 보기 → 메타 태그 확인
4. 캐시 삭제 후 재시도

### Q: 네이버 Search Adviser 소유권 확인이 실패합니다

1. 확인 코드가 정확히 입력되었는지 확인
2. `https://` 프로토콜로 등록했는지 확인
3. 배포 완료 후 5~10분 대기
4. 브라우저 시크릿 모드에서 페이지 소스 확인

### Q: Stibee 웹훅이 작동하지 않습니다

1. Edge Function이 정상 배포되었는지 확인
2. 웹훅 URL이 정확한지 확인
3. Supabase Edge Function Logs 확인
4. Stibee 웹훅 전송 로그 확인

---

## 다음 단계

1. **Google Analytics**: 일주일 후 트래픽 분석 시작
2. **Search Console**: 색인 생성 요청 (2~3일 소요)
3. **네이버 Search Adviser**: 검색 반영 확인 (1주일 소요)
4. **Stibee 웹훅**: 실시간 구독자 동기화 모니터링

## 참고 문서

- Google Analytics 4: https://support.google.com/analytics/
- Google Search Console: https://support.google.com/webmasters/
- 네이버 Search Adviser: https://searchadvisor.naver.com/guide/
- Stibee 웹훅: `hokex-front/STIBEE_WEBHOOK_SETUP.md`
