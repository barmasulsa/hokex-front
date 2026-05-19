# 방문자 통계 DB 마이그레이션 - 설계

## 시스템 아키텍처

### 데이터 흐름

```
일반 방문자 접속
    ↓
recordDetailedVisit() 호출
    ↓
├─→ localStorage에 즉시 저장 (동기, 0ms 지연)
│   └─→ 사용자는 바로 페이지 사용 가능
│
└─→ recordToDBAsync() 호출 (비동기, await 없음)
    └─→ DB에 UPSERT (백그라운드)
        ├─→ 성공: 통계 저장됨
        └─→ 실패: 무시 (사이트는 정상 작동)

관리자 접속
    ↓
getDetailedVisitorStats() 호출 (async)
    ↓
DB에서 전체 통계 조회
    ↓
관리자 페이지에 표시
```

## DB 스키마

### visitor_stats 테이블

```sql
CREATE TABLE visitor_stats (
  id UUID PRIMARY KEY,
  visit_date DATE NOT NULL,           -- 방문 날짜 (YYYY-MM-DD)
  visit_hour INTEGER NOT NULL,        -- 방문 시간 (0-23)
  visit_count INTEGER DEFAULT 1,      -- 해당 날짜/시간의 방문 수
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(visit_date, visit_hour)      -- 중복 방지
);

-- 인덱스
CREATE INDEX idx_visitor_stats_date ON visitor_stats(visit_date DESC);
CREATE INDEX idx_visitor_stats_date_hour ON visitor_stats(visit_date, visit_hour);
```

### RLS 정책

```sql
-- 모든 사용자가 읽기 가능
CREATE POLICY "Anyone can read visitor stats"
  ON visitor_stats FOR SELECT USING (true);

-- 인증된 사용자 + 익명 사용자 모두 쓰기 가능
CREATE POLICY "Authenticated users can insert visitor stats"
  ON visitor_stats FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Authenticated users can update visitor stats"
  ON visitor_stats FOR UPDATE
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
```

## 핵심 함수 설계

### 1. recordDetailedVisit()
**목적**: 방문 기록 (사용자는 렉 없음)

```typescript
export function recordDetailedVisit() {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const hour = now.getHours();
  
  // 오늘 이미 방문했는지 확인
  const lastVisitDate = localStorage.getItem('last_visit_date');
  if (lastVisitDate === date) {
    return; // 오늘 이미 방문했으면 카운트하지 않음
  }
  
  // 오늘 첫 방문이므로 기록
  localStorage.setItem('last_visit_date', date);
  
  // 1. localStorage에 즉시 저장 (동기)
  const records = getVisitRecords();
  const key = `${date}-${hour}`;
  const existingIndex = records.findIndex(r => `${r.date}-${r.hour}` === key);
  
  if (existingIndex >= 0) {
    records[existingIndex].count++;
  } else {
    records.push({ date, hour, count: 1 });
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  
  // 2. DB에 비동기 저장 (await 없음 - 렉 없음)
  recordToDBAsync(date, hour).catch(err => {
    console.log('방문 통계 DB 저장 실패 (무시):', err.message);
  });
}
```

### 2. recordToDBAsync()
**목적**: DB에 비동기 저장 (사용자는 기다리지 않음)

```typescript
async function recordToDBAsync(date: string, hour: number) {
  try {
    // UPSERT: 같은 날짜/시간이면 count 증가, 없으면 새로 생성
    const { error } = await supabase
      .from('visitor_stats')
      .upsert(
        {
          visit_date: date,
          visit_hour: hour,
          visit_count: 1
        },
        {
          onConflict: 'visit_date,visit_hour',
          ignoreDuplicates: false
        }
      );
    
    if (error) {
      // UPSERT 실패 시 기존 데이터 조회 후 업데이트
      const { data: existing } = await supabase
        .from('visitor_stats')
        .select('visit_count')
        .eq('visit_date', date)
        .eq('visit_hour', hour)
        .single();
      
      if (existing) {
        await supabase
          .from('visitor_stats')
          .update({ visit_count: existing.visit_count + 1 })
          .eq('visit_date', date)
          .eq('visit_hour', hour);
      } else {
        await supabase
          .from('visitor_stats')
          .insert({
            visit_date: date,
            visit_hour: hour,
            visit_count: 1
          });
      }
    }
  } catch (err) {
    // 에러 무시 (통계만 누락, 사이트는 정상)
    console.log('DB 저장 실패:', err);
  }
}
```

### 3. migrateOldDataToDB()
**목적**: 기존 localStorage 데이터를 DB로 마이그레이션

```typescript
export async function migrateOldDataToDB() {
  try {
    // 기존 visitor_history 데이터 가져오기
    const oldData = localStorage.getItem('visitor_history');
    if (!oldData) {
      console.log('마이그레이션할 기존 데이터가 없습니다.');
      return { success: true, migrated: 0 };
    }
    
    const visits: Record<string, number> = JSON.parse(oldData);
    let migratedCount = 0;
    
    // 각 날짜별 데이터를 DB에 저장
    for (const [date, count] of Object.entries(visits)) {
      if (count > 0) {
        // 시간대는 알 수 없으므로 12시(정오)로 설정
        const { error } = await supabase
          .from('visitor_stats')
          .upsert(
            {
              visit_date: date,
              visit_hour: 12,
              visit_count: count
            },
            {
              onConflict: 'visit_date,visit_hour',
              ignoreDuplicates: false
            }
          );
        
        if (!error) {
          migratedCount++;
        }
      }
    }
    
    console.log(`마이그레이션 완료: ${migratedCount}개 날짜 데이터 저장됨`);
    
    // 마이그레이션 완료 표시
    localStorage.setItem('visitor_data_migrated', 'true');
    
    return { success: true, migrated: migratedCount };
  } catch (err) {
    console.error('마이그레이션 실패:', err);
    return { success: false, migrated: 0, error: err };
  }
}
```

### 4. getDetailedVisitorStats()
**목적**: DB에서 전체 통계 조회 (관리자용)

```typescript
export async function getDetailedVisitorStats(): Promise<DetailedVisitorStats> {
  const now = new Date();
  const oneYearAgoStr = /* 1년 전 날짜 */;
  
  try {
    // DB에서 최근 1년 데이터 조회
    const { data: records, error } = await supabase
      .from('visitor_stats')
      .select('visit_date, visit_hour, visit_count')
      .gte('visit_date', oneYearAgoStr)
      .order('visit_date', { ascending: true });
    
    if (error) {
      console.error('DB 조회 실패:', error);
      return getEmptyStats();
    }
    
    // 통계 계산
    let todayCount = 0;
    let yesterdayCount = 0;
    let last7DaysCount = 0;
    let last30DaysCount = 0;
    let last365DaysCount = 0;
    let totalVisits = 0;
    
    records?.forEach(record => {
      const count = record.visit_count;
      totalVisits += count;
      
      // 날짜별 집계...
    });
    
    return {
      today: todayCount,
      yesterday: yesterdayCount,
      last7Days: last7DaysCount,
      last30Days: last30DaysCount,
      last365Days: last365DaysCount,
      hourlyToday,
      dailyLast30Days,
      dailyLast365Days,
      totalVisits,
      firstVisitDate
    };
  } catch (err) {
    console.error('통계 조회 중 에러:', err);
    return getEmptyStats();
  }
}
```

## 자동 마이그레이션 트리거

### App.tsx에서 실행

```typescript
useEffect(() => {
  initGA4();
  recordVisit();
  recordDetailedVisit(); // 세부 통계 기록
  
  // 기존 localStorage 데이터를 DB로 마이그레이션 (한 번만 실행)
  const migrated = localStorage.getItem('visitor_data_migrated');
  if (!migrated) {
    import('./utils/detailedAnalytics').then(({ migrateOldDataToDB }) => {
      migrateOldDataToDB().then(result => {
        if (result.success) {
          console.log(`방문자 통계 마이그레이션 완료: ${result.migrated}개 날짜`);
        }
      });
    });
  }
}, []);
```

## 관리자 페이지 수정

### BannerManagementPage.tsx

```typescript
// 방문자 통계 가져오기
useEffect(() => {
  const loadStats = async () => {
    const detailed = await getDetailedVisitorStats(); // async 호출
    setDetailedStats(detailed);
  };
  
  loadStats();
  
  // 1분마다 통계 업데이트
  const interval = setInterval(() => {
    loadStats();
  }, 60000);
  
  return () => clearInterval(interval);
}, []);
```

## 성능 최적화

### 1. 인덱스 활용
- `visit_date DESC` 인덱스: 최근 데이터 빠른 조회
- `(visit_date, visit_hour)` 복합 인덱스: UPSERT 빠른 처리

### 2. 비동기 처리
- `recordToDBAsync()`는 await 없이 호출
- 사용자는 DB 저장을 기다리지 않음
- 에러 발생 시 무시 (사이트는 정상 작동)

### 3. 데이터 크기 관리
- localStorage: 1년 이전 데이터 자동 삭제
- DB: 인덱스로 빠른 조회 (10년 데이터도 ~10ms)

## 에러 처리

### 1. DB 저장 실패
- 사이트는 정상 작동 (통계만 누락)
- 콘솔에 로그만 출력
- 사용자는 에러를 인지하지 못함

### 2. DB 조회 실패
- 빈 통계 반환 (0으로 표시)
- 관리자 페이지는 정상 렌더링

### 3. 마이그레이션 실패
- 플래그를 설정하지 않음
- 다음 접속 시 재시도

## 배포 순서

1. **DB 테이블 생성**
   - Supabase Dashboard에서 SQL 실행
   - `create-visitor-stats-table.sql`

2. **코드 배포**
   - `detailedAnalytics.ts` 수정
   - `BannerManagementPage.tsx` 수정
   - `App.tsx` 수정

3. **자동 마이그레이션**
   - 사용자가 사이트 접속 시 자동 실행
   - 기존 데이터 DB로 이전

4. **검증**
   - 관리자 페이지에서 통계 확인
   - 새 방문자 데이터 DB에 저장되는지 확인
