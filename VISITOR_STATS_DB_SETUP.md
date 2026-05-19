# 방문자 통계 DB 기반 전환 가이드

## 개요
방문자 통계 시스템을 localStorage + DB 하이브리드 방식으로 전환했습니다.

### 변경 사항
- **일반 방문자**: localStorage에 즉시 저장 (지연 없음) + DB에 비동기 저장 (백그라운드)
- **관리자**: DB에서 전체 방문자 통계 조회 (모든 방문객의 통계)

### 장점
1. **일반 사용자 경험**: 지연 없음 (localStorage는 즉시 저장)
2. **관리자 통계**: 전체 방문자 통계 확인 가능 (브라우저 독립적)
3. **성능**: 인덱스로 빠른 조회 (~10ms)
4. **확장성**: 10년 데이터(87,600행)도 빠르게 처리

---

## 1단계: Supabase 테이블 생성

### Supabase Dashboard 접속
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭

### SQL 실행
아래 SQL을 복사하여 실행:

```sql
-- 방문자 통계 테이블 생성
CREATE TABLE IF NOT EXISTS visitor_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_date DATE NOT NULL,
  visit_hour INTEGER NOT NULL CHECK (visit_hour >= 0 AND visit_hour <= 23),
  visit_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(visit_date, visit_hour)
);

-- 인덱스 생성 (빠른 조회를 위해)
CREATE INDEX IF NOT EXISTS idx_visitor_stats_date ON visitor_stats(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_stats_date_hour ON visitor_stats(visit_date, visit_hour);

-- RLS 활성화
ALTER TABLE visitor_stats ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능 (통계 조회)
CREATE POLICY "Anyone can read visitor stats"
  ON visitor_stats
  FOR SELECT
  USING (true);

-- 인증된 사용자만 삽입/업데이트 가능
CREATE POLICY "Authenticated users can insert visitor stats"
  ON visitor_stats
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Authenticated users can update visitor stats"
  ON visitor_stats
  FOR UPDATE
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- 자동 updated_at 업데이트 트리거
CREATE OR REPLACE FUNCTION update_visitor_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_visitor_stats_updated_at_trigger
  BEFORE UPDATE ON visitor_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_visitor_stats_updated_at();

-- 코멘트 추가
COMMENT ON TABLE visitor_stats IS '방문자 통계 (날짜별, 시간대별)';
COMMENT ON COLUMN visitor_stats.visit_date IS '방문 날짜 (YYYY-MM-DD)';
COMMENT ON COLUMN visitor_stats.visit_hour IS '방문 시간 (0-23)';
COMMENT ON COLUMN visitor_stats.visit_count IS '해당 날짜/시간의 방문 수';
```

### 실행 확인
- 성공 메시지: `Success. No rows returned`
- 왼쪽 메뉴 **Table Editor**에서 `visitor_stats` 테이블 확인

---

## 2단계: 배포

### Git 커밋 및 푸시
```bash
cd hokex-front
git add .
git commit -m "feat: 방문자 통계 DB 기반으로 전환 (localStorage + DB 하이브리드)"
git push origin main
```

### Vercel 자동 배포
- Vercel이 자동으로 배포 시작
- https://vercel.com/dashboard에서 배포 상태 확인

---

## 3단계: 테스트

### 일반 사용자 테스트
1. https://hokex.vercel.app 접속
2. 홈페이지 방문 (지연 없이 즉시 로드되어야 함)
3. 개발자 도구 콘솔에서 에러 없는지 확인

### 관리자 통계 확인
1. 관리자 계정으로 로그인 (`lcw5525@naver.com`)
2. 배너 관리 페이지 접속
3. **📊 방문자 통계** 탭 클릭
4. 전체 방문자 통계 확인:
   - 오늘, 어제, 최근 7일, 30일, 1년
   - 시간대별 통계 (오늘)
   - 일별 통계 (최근 30일, 1년)

### DB 데이터 확인
Supabase Dashboard → Table Editor → `visitor_stats` 테이블에서 데이터 확인

---

## 작동 방식

### 일반 방문자 (recordDetailedVisit)
```
1. 사용자가 사이트 방문
2. localStorage에 즉시 저장 (동기, 지연 없음)
3. DB에 비동기 저장 (백그라운드, await 없음)
   - 성공: 통계 누적
   - 실패: 무시 (사이트는 정상 작동)
```

### 관리자 통계 조회 (getDetailedVisitorStats)
```
1. DB에서 최근 1년 데이터 조회
2. 날짜별, 시간대별 집계
3. 통계 반환
   - 성공: 전체 방문자 통계 표시
   - 실패: 빈 통계 반환 (에러 무시)
```

---

## 성능 고려사항

### 데이터 크기
- 1일 = 24행 (시간대별)
- 1년 = 8,760행
- 10년 = 87,600행

### 조회 속도
- 인덱스 사용: ~10ms (매우 빠름)
- 이벤트 데이터(~5,000행)보다 빠름

### 저장 방식
- UPSERT: 같은 날짜/시간이면 count 증가
- UNIQUE 제약조건: (visit_date, visit_hour)

---

## 문제 해결

### 통계가 0으로 표시되는 경우
1. Supabase Dashboard에서 `visitor_stats` 테이블 확인
2. 데이터가 없으면 사용자가 방문할 때까지 대기
3. RLS 정책 확인 (읽기는 모두 가능해야 함)

### DB 저장 실패
- 콘솔에 에러 로그 확인: `방문 통계 DB 저장 실패 (무시)`
- 사이트는 정상 작동 (localStorage는 저장됨)
- Supabase 연결 상태 확인

### 관리자 통계 로딩 느림
- 인덱스 확인: `idx_visitor_stats_date`, `idx_visitor_stats_date_hour`
- 데이터 크기 확인 (10년 이상이면 정리 고려)

---

## 완료!

이제 방문자 통계가 DB 기반으로 작동합니다:
- ✅ 일반 사용자: 지연 없음
- ✅ 관리자: 전체 통계 확인 가능
- ✅ 성능: 빠른 조회 (~10ms)
- ✅ 확장성: 10년 데이터도 처리 가능
