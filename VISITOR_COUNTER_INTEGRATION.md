# 방문자 카운터 API 통합 완료

## 📋 개요

기존 Supabase 기반 방문자 추적 시스템을 오픈소스 Free Visitor Counter API로 완전히 교체했습니다.

### 오픈소스 정보
- **GitHub**: https://github.com/rundevelrun/free-visit-counter-api-dashboard
- **API Base URL**: https://visitor.6developer.com
- **기술 스택**: Flask + Redis + PostgreSQL

## ✨ 주요 기능

### 1. 실시간 방문자 추적
- ✅ 중복 방지 (20분 TTL Redis 기반)
- ✅ 타임존 지원 (한국 시간 기준)
- ✅ 페이지별 분석
- ✅ 리퍼러 추적
- ✅ 검색 쿼리 분석

### 2. 대시보드
- ✅ 반응형 디자인
- ✅ 다크/라이트 테마 자동 전환
- ✅ 실시간 통계
- ✅ 인기 페이지 분석
- ✅ 리퍼러 분석
- ✅ 검색 쿼리 분석

### 3. 무료 & 오픈소스
- ✅ 100% 무료
- ✅ 숨겨진 비용 없음
- ✅ 프리미엄 기능 없음
- ✅ 여러 웹사이트 지원

## 🔧 구현 내역

### 1. 새 유틸리티 파일 생성
**파일**: `src/utils/visitorCounter.ts`

```typescript
// 주요 함수
export async function recordVisit(): Promise<VisitorStats | null>
export async function getVisitorStats(): Promise<VisitorStats | null>
export function getDashboardUrl(): string
export function getLoginUrl(): string
```

### 2. UI 컴포넌트 생성
**파일**: `src/components/VisitorStats.tsx`

- 오늘 방문자 수
- 전체 방문자 수
- 대시보드 링크
- 30초마다 자동 새로고침

### 3. App.tsx 통합
```typescript
// App.tsx에서 방문 기록
import { recordVisit as recordVisitorCounter } from './utils/visitorCounter';

useEffect(() => {
  initGA4();
  recordVisit();
  
  // 새로운 방문자 카운터 API 호출
  recordVisitorCounter().then(stats => {
    if (stats) {
      console.log('[방문자 카운터] 통계:', {
        오늘: stats.todayCount,
        전체: stats.totalCount,
        대시보드: stats.dashboardUrl
      });
    }
  });
}, []);
```

### 4. HomePage.tsx 업데이트
```typescript
// HomePage.tsx에 방문자 통계 표시
import { VisitorStats } from '../components/VisitorStats';

// 렌더링
<VisitorStats />
```

## 🎯 중복 방지 메커니즘

### 1. 서버 측 (Redis)
- 20분 TTL의 Redis 캐시
- IP + User-Agent 기반 중복 방지
- 동일 방문자의 반복 카운팅 방지

### 2. 클라이언트 측 (세션 스토리지)
```typescript
const SESSION_KEY = 'visitor_recorded_this_session';

// 세션 내 중복 호출 방지
if (sessionStorage.getItem(SESSION_KEY) === 'true') {
  console.log('[방문자 추적] 이번 세션에서 이미 기록됨 - 스킵');
  return null;
}
```

## 📊 데이터 수집

### 자동 수집 데이터
- **도메인**: `window.location.hostname`
- **타임존**: `Intl.DateTimeFormat().resolvedOptions().timeZone`
- **페이지 경로**: `window.location.pathname`
- **페이지 제목**: `document.title`
- **리퍼러**: `document.referrer`
- **검색 쿼리**: 검색 엔진에서 온 경우 자동 추출

### 지원 검색 엔진
- Google (google.com)
- Bing (bing.com)
- Yahoo (yahoo.com)
- DuckDuckGo (duckduckgo.com)
- Naver (naver.com)
- Daum (daum.net)

## 🔗 대시보드 접근

### 1. 로그인 페이지
```
https://visitor.6developer.com/login
```
- 도메인만 입력하면 통계 조회 가능

### 2. 직접 대시보드 링크
```typescript
getDashboardUrl()
// 결과: https://visitor.6developer.com/dashboard?domain=your-domain.com
```

### 3. UI에서 접근
HomePage 오른쪽 사이드바 → "📊 상세 대시보드 보기" 버튼 클릭

## 🚀 배포 후 확인 사항

### 1. 브라우저 콘솔 확인
```javascript
// 방문 기록 성공
[방문자 카운터] 통계: { 오늘: 1, 전체: 1, 대시보드: "https://..." }

// 중복 방지 작동
[방문자 추적] 이번 세션에서 이미 기록됨 - 스킵
```

### 2. UI 확인
- HomePage 오른쪽 사이드바에 방문자 통계 표시
- "오늘 방문자" 카드
- "전체 방문자" 카드
- "📊 상세 대시보드 보기" 버튼

### 3. 대시보드 확인
1. 버튼 클릭 또는 직접 접속
2. 실시간 통계 확인
3. 그래프 및 차트 확인
4. 인기 페이지, 리퍼러, 검색 쿼리 확인

## 📦 제거된 파일 (옵션)

다음 파일들은 더 이상 필요하지 않습니다:

```
hokex-front/
├── supabase-migrations/
│   └── create-visitor-stats-cache.sql
├── src/
│   └── utils/
│       └── detailedAnalytics.ts (대부분의 기능 대체됨)
└── supabase/functions/
    └── update-visitor-stats-cache/
        └── index.ts
```

**주의**: 기존 Supabase 방문자 데이터는 백업해두는 것을 권장합니다.

## 🔄 마이그레이션 가이드

### 기존 데이터 백업
```sql
-- Supabase에서 기존 데이터 내보내기
SELECT * FROM visitor_stats ORDER BY visit_date DESC;
```

### 점진적 마이그레이션
1. 새 API와 기존 시스템 병행 운영 가능
2. 일정 기간 데이터 비교
3. 안정화 후 기존 시스템 제거

## 🎨 커스터마이징

### 1. 통계 새로고침 주기 변경
```typescript
// VisitorStats.tsx
const interval = setInterval(loadStats, 30000); // 30초 → 원하는 시간으로 변경
```

### 2. UI 스타일 변경
```typescript
// VisitorStats.tsx에서 스타일 수정
style={{
  background: '#4A90E2', // 색상 변경
  borderRadius: '8px',   // 모서리 변경
  // ...
}}
```

### 3. 추가 데이터 수집
```typescript
// visitorCounter.ts의 recordVisit() 함수에서
body: JSON.stringify({
  domain: DOMAIN,
  // ... 기존 필드
  custom_field: 'your_value' // 커스텀 필드 추가
})
```

## 📚 API 문서

### POST /visit
방문 기록

**Request**:
```json
{
  "domain": "example.com",
  "timezone": "Asia/Seoul",
  "page_path": "/",
  "page_title": "홈페이지",
  "referrer": "https://google.com",
  "search_query": "검색어"
}
```

**Response**:
```json
{
  "dashboardUrl": "https://visitor.6developer.com/dashboard?domain=example.com",
  "totalCount": 42,
  "todayCount": 5
}
```

### GET /visit?domain=example.com
방문 통계 조회

**Response**:
```json
{
  "dashboardUrl": "https://visitor.6developer.com/dashboard?domain=example.com",
  "totalCount": 42,
  "todayCount": 5
}
```

## 🐛 트러블슈팅

### 문제: 방문자 수가 증가하지 않음
**해결**:
1. 브라우저 콘솔에서 에러 확인
2. API 서버 상태 확인 (`https://visitor.6developer.com`)
3. CORS 에러 확인
4. 네트워크 탭에서 요청 확인

### 문제: 중복 카운팅
**해결**:
1. Redis 캐시 확인 (20분 TTL)
2. 세션 스토리지 확인
3. 브라우저 캐시 지우기

### 문제: 대시보드 접속 불가
**해결**:
1. 도메인 정확히 입력
2. https 프로토콜 사용
3. 브라우저 쿠키/캐시 지우기

## 📞 지원

### 오픈소스 저장소
- https://github.com/rundevelrun/free-visit-counter-api-dashboard

### 이슈 제보
- GitHub Issues 페이지에서 문제 보고

### 기여하기
- Pull Request 환영
- 버그 수정, 기능 추가, 문서 개선

## 📄 라이선스

- **오픈소스**: MIT License
- **상업적 이용**: 가능
- **수정/배포**: 가능
- **출처 표시**: 권장

## 🎉 완료!

방문자 카운터 API 통합이 완료되었습니다. 이제 실시간으로 방문자 통계를 확인할 수 있으며, 상세한 분석 대시보드도 이용 가능합니다.

---

**마지막 업데이트**: 2026-06-09
