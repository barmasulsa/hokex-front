# 🎯 방문자 카운터 기능 명세

## 📊 구현된 기능

### 1. 실시간 방문자 추적 ✅
- **중복 방지**: 동일 방문자 20분 TTL
- **타임존 지원**: 사용자 시간대 기준 "오늘" 계산
- **자동 추적**: 페이지 로드 시 자동으로 방문 기록

### 2. 상세 분석 데이터 ✅
- **페이지별 추적**: 각 페이지 방문 횟수
- **리퍼러 분석**: 방문자가 어디서 왔는지 추적
- **검색 쿼리**: 검색 엔진을 통한 유입 키워드 분석
- **시간대별 분석**: 시간/일/주/월/년 단위 통계

### 3. 데이터베이스 구조

#### visitor_sites
```sql
- id: UUID (PK)
- domain: VARCHAR(255) UNIQUE
- total_count: INTEGER
- today_count: INTEGER
- last_visit_date: DATE
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### visitor_logs
```sql
- id: UUID (PK)
- site_id: UUID (FK)
- timezone: VARCHAR(50)
- page_path: TEXT
- page_title: TEXT
- referrer: TEXT
- search_query: TEXT
- visitor_ip: TEXT
- user_agent: TEXT
- timestamp: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
```

#### visitor_dedup
```sql
- id: UUID (PK)
- site_id: UUID (FK)
- visitor_hash: TEXT
- last_visit: TIMESTAMPTZ
- ttl_expiry: TIMESTAMPTZ (자동 만료: 20분)
```

## 🔥 핵심 기능

### 방문 추적 API
```typescript
POST /functions/v1/track-visit

Request:
{
  "domain": "hokex.xyz",
  "timezone": "Asia/Seoul",
  "page_path": "/events/123",
  "page_title": "행사 상세",
  "referrer": "https://google.com/search?q=전시회",
  "search_query": "전시회"
}

Response:
{
  "dashboardUrl": "https://hokex.xyz/visitor-stats?domain=hokex.xyz",
  "totalCount": 42,
  "todayCount": 5,
  "counted": true
}
```

### Helper Functions

#### get_visitor_stats
```sql
SELECT get_visitor_stats('hokex.xyz', 'Asia/Seoul');
-- Returns: { totalCount, todayCount, dashboardUrl }
```

#### get_popular_pages
```sql
SELECT * FROM get_popular_pages(
  p_site_id := 'UUID',
  p_start_date := '2024-01-01',
  p_end_date := '2024-12-31',
  p_limit := 10
);
-- Returns: page_path, page_title, visit_count
```

#### get_referrer_stats
```sql
SELECT * FROM get_referrer_stats(
  p_site_id := 'UUID',
  p_start_date := '2024-01-01',
  p_end_date := '2024-12-31',
  p_limit := 10
);
-- Returns: referrer, visit_count
```

## 📈 사용 예시

### React 컴포넌트
```typescript
import { useVisitorTracker } from './utils/visitorTracker';

function HomePage() {
  const { stats, loading } = useVisitorTracker();

  return (
    <div>
      {!loading && stats && (
        <div className="visitor-stats">
          <span>오늘 방문: {stats.todayCount}</span>
          <span>총 방문: {stats.totalCount}</span>
        </div>
      )}
    </div>
  );
}
```

### 순수 JavaScript
```javascript
trackVisit().then(data => {
  console.log(`오늘 ${data.todayCount}명 방문`);
  console.log(`총 ${data.totalCount}명 방문`);
});
```

## 🎨 UI 표시 방법

### HTML 엘리먼트
```html
<!-- ID로 찾기 -->
<div>
  총 방문자: <span id="visitor-total-count">0</span>명
  오늘 방문자: <span id="visitor-today-count">0</span>명
</div>

<!-- data attribute로 찾기 -->
<div>
  <span data-visitor-count="total">0</span>
  <span data-visitor-count="today">0</span>
</div>
```

### React 컴포넌트
```typescript
function VisitorBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    trackVisit().then(data => {
      setCount(data?.todayCount || 0);
    });
  }, []);

  return (
    <Badge>
      <Eye className="mr-1" />
      오늘 {count.toLocaleString()}명 방문
    </Badge>
  );
}
```

## 🔒 보안 및 프라이버시

### 중복 방지 메커니즘
- IP + User-Agent 해시로 방문자 식별
- 20분 TTL로 중복 카운팅 방지
- 개인정보 직접 저장하지 않음

### RLS (Row Level Security)
- 모든 테이블에 RLS 활성화
- 읽기는 모두 허용
- 쓰기는 service_role만 허용

### 데이터 정리
- 만료된 dedup 레코드 자동 삭제
- 주기적인 데이터 아카이빙 권장

## 📊 통계 쿼리 예시

### 시간대별 방문자
```sql
SELECT 
  EXTRACT(HOUR FROM timestamp) as hour,
  COUNT(*) as visits
FROM visitor_logs
WHERE site_id = (SELECT id FROM visitor_sites WHERE domain = 'hokex.xyz')
  AND DATE(timestamp) = CURRENT_DATE
GROUP BY hour
ORDER BY hour;
```

### 일별 방문자 (최근 30일)
```sql
SELECT 
  DATE(timestamp) as date,
  COUNT(*) as visits
FROM visitor_logs
WHERE site_id = (SELECT id FROM visitor_sites WHERE domain = 'hokex.xyz')
  AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY date
ORDER BY date;
```

### 인기 검색어
```sql
SELECT 
  search_query,
  COUNT(*) as count
FROM visitor_logs
WHERE site_id = (SELECT id FROM visitor_sites WHERE domain = 'hokex.xyz')
  AND search_query != ''
GROUP BY search_query
ORDER BY count DESC
LIMIT 20;
```

## 🚀 성능 최적화

### 인덱스
```sql
-- 이미 생성된 인덱스들
CREATE INDEX idx_visitor_logs_site_timestamp ON visitor_logs(site_id, timestamp DESC);
CREATE INDEX idx_visitor_logs_page_path ON visitor_logs(page_path);
CREATE INDEX idx_visitor_logs_referrer ON visitor_logs(referrer);
```

### 파티셔닝 (대용량 트래픽용)
```sql
-- 월별 파티션 예시
CREATE TABLE visitor_logs_2024_01 PARTITION OF visitor_logs
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

## 🎯 다음 단계

### Phase 1: 기본 기능 (완료)
- ✅ 방문자 추적
- ✅ 중복 방지
- ✅ 타임존 지원
- ✅ 페이지/리퍼러 추적

### Phase 2: 대시보드 UI
- 📊 관리자 대시보드 페이지
- 📈 실시간 차트
- 📉 기간별 비교
- 🗂️ 엑셀 내보내기

### Phase 3: 고급 기능
- 🔔 알림 설정 (방문자 수 임계값)
- 📧 주간/월간 이메일 리포트
- 🤖 봇 필터링
- 🌍 지역별 통계

## 📄 라이선스
MIT License - Based on [free-visit-counter-api-dashboard](https://github.com/rundevelrun/free-visit-counter-api-dashboard)
