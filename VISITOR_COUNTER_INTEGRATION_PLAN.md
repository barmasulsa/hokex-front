# Free Visitor Counter API 통합 계획

## 📋 개요
`rundevelrun/free-visit-counter-api-dashboard` 프로젝트를 hokex-front에 통합하여 
강력한 방문자 통계 시스템을 구축합니다.

## 🎯 주요 기능
- ✅ 실시간 방문자 추적 (중복 방지 20분 TTL)
- ✅ 타임존 기반 "오늘" 계산
- ✅ 페이지별 분석 (인기 페이지, 리퍼러, 검색 쿼리)
- ✅ 반응형 대시보드 (다크/라이트 테마)
- ✅ 시간/일/주/월/년 단위 통계

## 🏗️ 구현 단계

### 1단계: Supabase 데이터베이스 마이그레이션 ✅
```sql
-- visitor-counter-api의 스키마를 Supabase에 적용
-- 테이블: sites, visit_log
```

### 2단계: Supabase Edge Functions 생성
```typescript
// functions/record-visit/index.ts
// POST /visit 엔드포인트 구현
```

### 3단계: 프론트엔드 추적 스크립트
```typescript
// src/utils/visitorTracker.ts
// 자동 방문자 추적 스크립트
```

### 4단계: 대시보드 페이지
```typescript
// src/pages/VisitorStatsPage.tsx
// 관리자용 방문자 통계 대시보드
```

### 5단계: Redis 대체 (Supabase 활용)
- Supabase의 built-in caching 활용
- 또는 Upstash Redis 연동

## 📊 기존 시스템과의 차이점

| 기능 | 기존 시스템 | 새 시스템 |
|------|------------|----------|
| 페이지별 추적 | ❌ | ✅ |
| 리퍼러 분석 | ❌ | ✅ |
| 검색 쿼리 추적 | ❌ | ✅ |
| 인기 페이지 | ❌ | ✅ |
| 시간대별 분석 | 기본 | 고급 (24시간) |
| 대시보드 UI | 기본 | 고급 (차트) |

## 🚀 다음 단계
1. Supabase 마이그레이션 파일 생성
2. Edge Functions 구현
3. 프론트엔드 통합
4. 테스트 및 배포

## 📝 참고 자료
- 원본 저장소: https://github.com/rundevelrun/free-visit-counter-api-dashboard
- 라이선스: MIT
