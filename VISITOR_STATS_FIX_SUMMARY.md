# 방문자 통계 자동 업데이트 및 시간대 문제 해결

## 📌 요약

### 수정 내용
1. ✅ **30분마다 오늘 방문자 수 업데이트** (GitHub Actions Cron 사용)
2. ✅ **새벽 4시 전체 통계 업데이트** (GitHub Actions Cron 사용)
3. ✅ **시간대 문제 해결**: UTC → KST 기준으로 통일

### 적용된 파일
- `fix-timezone-and-cron.sql` - 시간대 문제 수정 SQL
- `check-timezone-issue.sql` - 시간대 검증 쿼리
- `.github/workflows/update-visitor-cache.yml` - GitHub Actions Cron 설정
- `SETUP_VISITOR_STATS_CRON.md` - 상세 설정 가이드
- `supabase/functions/update-visitor-stats-cache/index.ts` - Edge Function (이미 완료)

---

## 🎯 빠른 적용 가이드

### 1단계: SQL 실행

Supabase Dashboard → SQL Editor에서 실행:

```sql
-- fix-timezone-and-cron.sql 파일 내용 복사하여 실행
```

### 2단계: GitHub Secrets 설정

GitHub Repository → Settings → Secrets and variables → Actions:

**추가할 Secrets**:
- `SUPABASE_URL`: `https://your-project-ref.supabase.co`
- `SUPABASE_ANON_KEY`: `eyJ...` (Supabase Dashboard → Settings → API에서 확인)

### 3단계: GitHub Actions Workflow 파일 적용

이미 생성된 파일을 Git에 커밋 및 푸시:

```bash
cd hokex-front
git add .github/workflows/update-visitor-cache.yml
git commit -m "Add visitor stats auto-update cron"
git push
```

### 4단계: 검증

#### 4-1. GitHub Actions 확인
- GitHub Repository → Actions 탭
- "Update Visitor Stats Cache" 워크플로우 확인
- "Run workflow" 버튼으로 수동 실행 테스트

#### 4-2. 시간대 검증
Supabase SQL Editor:

```sql
-- check-timezone-issue.sql 파일 실행
```

**예상 결과** (현재 낮 12시라면):
```
visit_hour: 12
생성시각(KST): 2026-06-02 12:xx:xx
저장방식: ✅ 정상 (KST 저장)
```

---

## 🔍 문제 진단 및 해결

### 현재 문제 상황

**문제 1: 시간대 불일치**
- **현상**: 낮 12시에 방문했는데 "새벽 2시" 또는 "새벽 3시"로 표시됨
- **원인**: visit_hour가 UTC 기준으로 저장되어 KST와 9시간 차이 발생
- **해결**: `fix-timezone-and-cron.sql` 실행으로 KST 기준 저장 적용

**문제 2: 오늘 방문자 수 업데이트 주기**
- **현상**: 오늘 방문자 수가 실시간으로 업데이트되지 않음
- **원인**: 캐시가 자동으로 업데이트되지 않음
- **해결**: GitHub Actions Cron으로 30분마다 자동 업데이트

---

## 📊 작동 방식

### 방문 기록 프로세스

```
사용자 방문
    ↓
detailedAnalytics.ts: recordDetailedVisit()
    ↓
KST 시간 계산 (UTC+9)
    ↓
localStorage 저장 (즉시)
    ↓
DB 저장 (비동기): increment_visitor_stat(date, hour)
    ↓
visitor_stats 테이블에 UPSERT
```

### 통계 업데이트 프로세스

```
GitHub Actions Cron
    ↓
[30분마다] Edge Function 호출: {"type": "today"}
    ↓
오늘 방문자 수 집계
    ↓
visitor_stats_cache 업데이트 (today 필드만)
    
    
[새벽 4시] Edge Function 호출: {"type": "full"}
    ↓
전체 통계 집계 (어제, 최근 7일, 30일, 1년)
    ↓
visitor_stats_cache 전체 업데이트
```

### 통계 표시 프로세스

```
관리자 페이지 로드
    ↓
getDetailedVisitorStats()
    ↓
1. 캐시에서 기본 통계 가져오기 (빠름)
    ↓
2. DB에서 최근 1년 데이터 가져오기
    ↓
3. 시간대별/일별 통계 계산
    ↓
화면 표시
```

---

## 🎯 검증 체크리스트

### 필수 검증 항목

- [ ] **SQL 실행 완료**: `fix-timezone-and-cron.sql` 실행
- [ ] **GitHub Secrets 설정**: SUPABASE_URL, SUPABASE_ANON_KEY 추가
- [ ] **Workflow 파일 커밋**: `.github/workflows/update-visitor-cache.yml` 푸시
- [ ] **Actions 실행 확인**: GitHub Actions 탭에서 워크플로우 실행 확인
- [ ] **시간대 검증**: visit_hour가 KST 기준인지 확인
- [ ] **수동 테스트**: 지금 방문 → 관리자 페이지 확인 → 현재 시간에 기록되는지 확인
- [ ] **30분 대기**: 30분 후 캐시가 자동 업데이트되는지 확인

### 시간대 검증 상세

**검증 SQL**:

```sql
SELECT 
  visit_hour as "저장된시간",
  EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Seoul') as "실제생성시각(KST)",
  CASE 
    WHEN visit_hour = EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Seoul') THEN '✅ 정상'
    ELSE '❌ 문제있음'
  END as "상태"
FROM visitor_stats
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

**예상 결과**:
```
저장된시간 | 실제생성시각(KST) | 상태
---------|----------------|-------
12       | 12             | ✅ 정상
```

**문제 있는 경우**:
```
저장된시간 | 실제생성시각(KST) | 상태
---------|----------------|-------
3        | 12             | ❌ 문제있음  (UTC로 저장됨)
```

---

## 🛠️ 트러블슈팅

### 문제 1: GitHub Actions가 실행되지 않음

**원인**:
- Repository가 Private이고 무료 플랜인 경우 제한될 수 있음
- Workflow 파일 문법 오류

**해결**:
1. GitHub Repository → Actions 탭 → Workflows 확인
2. "Update Visitor Stats Cache" 워크플로우 찾기
3. "Run workflow" 버튼으로 수동 실행 테스트
4. 에러 발생 시 로그 확인

**대안**:
- Vercel Cron (무료, 하루 1회 제한)
- Cron-job.org (외부 서비스, 무료)
- Supabase pg_cron (Pro 플랜 필요)

### 문제 2: 시간대가 여전히 UTC로 저장됨

**진단**:

```sql
SELECT 
  visit_date,
  visit_hour,
  created_at AT TIME ZONE 'Asia/Seoul' as created_at_kst
FROM visitor_stats
WHERE created_at > NOW() - INTERVAL '1 hour';
```

**예상**: visit_hour = 12, created_at_kst = 2026-06-02 12:xx:xx
**문제**: visit_hour = 3, created_at_kst = 2026-06-02 12:xx:xx

**해결**:
1. 브라우저 캐시 삭제 (Ctrl+Shift+Delete)
2. 하드 리프레시 (Ctrl+F5)
3. `detailedAnalytics.ts` 67-70번 줄 KST 변환 로직 재확인
4. 새 방문 테스트 (시크릿 모드)

### 문제 3: Edge Function 호출 실패

**증상**: GitHub Actions 로그에 "Failed to update stats" 표시

**원인**:
- SUPABASE_URL 또는 SUPABASE_ANON_KEY 잘못 설정
- Edge Function이 배포되지 않음
- Edge Function에 에러 발생

**해결**:
1. GitHub Secrets 확인
2. Edge Function 배포 상태 확인 (Supabase Dashboard → Edge Functions)
3. Edge Function 로그 확인 (Supabase Dashboard → Edge Functions → Logs)
4. 수동 호출 테스트:

```bash
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/update-visitor-stats-cache' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"type": "today"}'
```

---

## 📈 기대 효과

### 수정 전
- ❌ 오늘 방문자 수가 실시간으로 업데이트되지 않음
- ❌ 시간대별 통계가 UTC 기준으로 표시 (낮 12시 → 새벽 3시로 표시)
- ❌ 수동으로 페이지 새로고침해야 최신 통계 확인 가능

### 수정 후
- ✅ 30분마다 오늘 방문자 수 자동 업데이트
- ✅ 시간대별 통계가 KST 기준으로 정확하게 표시
- ✅ 새벽 4시 전체 통계 자동 집계
- ✅ 관리자 페이지에서 실시간성 높은 통계 확인 가능

---

## 📝 추가 개선 제안

### 1. 실시간 통계 (선택사항)

현재는 30분마다 업데이트되지만, 더 실시간성을 높이려면:

**방법 A**: GitHub Actions Cron 간격 단축 (5분)
```yaml
on:
  schedule:
    - cron: '*/5 * * * *'  # 5분마다
```

**방법 B**: Supabase Realtime 구독
- visitor_stats 테이블에 INSERT 발생 시 자동으로 프론트엔드 업데이트
- 복잡도 증가, 서버 부하 증가

### 2. 통계 대시보드 개선

- 시간대별 그래프 (Chart.js)
- 방문 트렌드 분석
- 주간/월간 비교

### 3. 알림 기능

- 일일 방문자 수가 특정 임계값 초과 시 알림
- 새로운 최고 기록 달성 시 알림

---

## ✅ 완료!

이제 방문자 통계 시스템이 다음과 같이 작동합니다:

1. ✅ **정확한 시간대**: KST 기준으로 기록 및 표시
2. ✅ **자동 업데이트**: 30분마다 오늘 방문자 수 업데이트
3. ✅ **일일 집계**: 매일 새벽 4시 전체 통계 업데이트
4. ✅ **안정적인 운영**: GitHub Actions 기반 자동화

**확인 방법**:
1. 지금 사이트 방문
2. 관리자 페이지 → "방문자 통계" → "시간대별 (오늘)" 탭
3. 현재 시간(낮 12시)에 방문 기록이 "12시"로 표시되는지 확인
4. 30분 후 "오늘 방문자 수"가 업데이트되는지 확인

**문제 발생 시**:
- `check-timezone-issue.sql` 실행하여 시간대 검증
- GitHub Actions 로그 확인
- Edge Function 로그 확인 (Supabase Dashboard)
- `SETUP_VISITOR_STATS_CRON.md` 참조
