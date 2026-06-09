# 🚀 Visitor Counter API 배포 가이드

## 📋 개요
무료 방문자 카운터 API를 hokex-front 프로젝트에 통합했습니다.

## ✅ 배포 단계

### 1단계: Supabase 데이터베이스 마이그레이션

```bash
# Supabase SQL Editor에서 실행
# File: supabase-migrations/create-advanced-visitor-stats.sql
```

또는 Supabase CLI 사용:
```bash
supabase db push --file supabase-migrations/create-advanced-visitor-stats.sql
```

**확인사항:**
- ✅ `visitor_sites` 테이블 생성됨
- ✅ `visitor_logs` 테이블 생성됨
- ✅ `visitor_dedup` 테이블 생성됨
- ✅ RLS 정책 적용됨
- ✅ Helper functions 생성됨

### 2단계: Supabase Edge Function 배포

```bash
# Edge Function 배포
supabase functions deploy track-visit
```

**확인사항:**
```bash
# 테스트 요청
curl -X POST \
  https://your-project.supabase.co/functions/v1/track-visit \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{
    "domain": "hokex.xyz",
    "timezone": "Asia/Seoul",
    "page_path": "/",
    "page_title": "Home"
  }'
```

예상 응답:
```json
{
  "dashboardUrl": "https://hokex.xyz/visitor-stats?domain=hokex.xyz",
  "totalCount": 1,
  "todayCount": 1,
  "counted": true
}
```

### 3단계: 프론트엔드 통합

#### Option A: React App에 통합

`src/App.tsx` 또는 레이아웃 컴포넌트에 추가:

```typescript
import { trackVisit } from './utils/visitorTracker';

function App() {
  useEffect(() => {
    // 관리자 페이지가 아닌 경우에만 추적
    if (!window.location.pathname.includes('/admin')) {
      trackVisit();
    }
  }, []);

  return (
    <div className="App">
      {/* 앱 컨텐츠 */}
    </div>
  );
}
```

#### Option B: HTML 스크립트 태그로 추가

`public/index.html`에 추가:

```html
<script>
(function() {
  const domain = window.location.hostname;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const page_path = window.location.pathname;
  const page_title = document.title;
  const referrer = document.referrer;
  
  // 검색 쿼리 추출
  let search_query = '';
  if (referrer) {
    try {
      const url = new URL(referrer);
      const engines = [
        { h: 'google', p: 'q' },
        { h: 'bing', p: 'q' },
        { h: 'naver', p: 'query' }
      ];
      for (const e of engines) {
        if (url.hostname.includes(e.h)) {
          search_query = url.searchParams.get(e.p) || '';
          break;
        }
      }
    } catch (e) {}
  }

  fetch('https://YOUR_PROJECT.supabase.co/functions/v1/track-visit', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'apikey': 'YOUR_ANON_KEY'
    },
    body: JSON.stringify({ 
      domain, 
      timezone,
      page_path,
      page_title,
      referrer,
      search_query
    })
  })
  .then(r => r.json())
  .then(data => {
    console.log('방문자 수:', data.todayCount);
    // 원하는 경우 페이지에 표시
    const el = document.getElementById('visitor-count');
    if (el) el.textContent = data.totalCount;
  })
  .catch(e => console.error('추적 오류:', e));
})();
</script>
```

### 4단계: 방문자 수 표시하기

페이지 어디든지 방문자 수를 표시할 수 있습니다:

```html
<!-- 총 방문자 수 -->
<span id="visitor-total-count">0</span>

<!-- 오늘 방문자 수 -->
<span id="visitor-today-count">0</span>

<!-- data attribute 사용 -->
<span data-visitor-count="total">0</span>
<span data-visitor-count="today">0</span>
```

## 📊 통계 대시보드 (선택사항)

### Supabase에서 쿼리하기

```sql
-- 전체 통계
SELECT * FROM visitor_sites WHERE domain = 'hokex.xyz';

-- 오늘 방문자
SELECT COUNT(*) FROM visitor_logs 
WHERE site_id = (SELECT id FROM visitor_sites WHERE domain = 'hokex.xyz')
  AND DATE(timestamp) = CURRENT_DATE;

-- 인기 페이지 (최근 7일)
SELECT page_path, page_title, COUNT(*) as views
FROM visitor_logs
WHERE site_id = (SELECT id FROM visitor_sites WHERE domain = 'hokex.xyz')
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY page_path, page_title
ORDER BY views DESC
LIMIT 10;

-- 리퍼러 통계
SELECT referrer, COUNT(*) as count
FROM visitor_logs
WHERE site_id = (SELECT id FROM visitor_sites WHERE domain = 'hokex.xyz')
  AND referrer != ''
GROUP BY referrer
ORDER BY count DESC
LIMIT 10;
```

### React 대시보드 컴포넌트 (향후 개발)

```typescript
// src/pages/VisitorStatsPage.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

function VisitorStatsPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { data } = await supabase
      .rpc('get_visitor_stats', { p_domain: 'hokex.xyz' });
    setStats(data);
  };

  return (
    <div>
      <h1>방문자 통계</h1>
      {stats && (
        <>
          <div>총 방문: {stats.totalCount}</div>
          <div>오늘 방문: {stats.todayCount}</div>
        </>
      )}
    </div>
  );
}
```

## 🔧 유지보수

### 중복 방문 데이터 정리

```sql
-- 매일 자동 실행 (pg_cron 설정)
SELECT cron.schedule(
  'cleanup-visitor-dedup',
  '0 */4 * * *', -- 4시간마다
  'SELECT cleanup_expired_visitor_dedup()'
);
```

### 성능 모니터링

```sql
-- 테이블 크기 확인
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'visitor%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 🎉 완료!

방문자 카운터 API가 성공적으로 배포되었습니다!

### 다음 단계:
1. ✅ 프로덕션 환경에 배포
2. ✅ 방문자 통계 대시보드 UI 개발
3. ✅ 실시간 차트 추가
4. ✅ 이메일 리포트 기능 (선택사항)

## 📝 참고 자료
- [원본 프로젝트](https://github.com/rundevelrun/free-visit-counter-api-dashboard)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Database](https://supabase.com/docs/guides/database)
