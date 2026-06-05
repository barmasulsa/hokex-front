# 🎯 Mock GA Stats 임시 배포 가이드

Google Analytics 권한 문제를 나중에 해결하고, **먼저 UI 테스트**를 위해 Mock 데이터를 배포합니다.

---

## 1️⃣ Mock 버전으로 교체

```bash
# 원본 백업 (나중에 복구용)
copy supabase\functions\get-ga-stats\index.ts supabase\functions\get-ga-stats\index-original.ts

# Mock 버전을 원본으로 교체
copy supabase\functions\get-ga-stats\index-mock.ts supabase\functions\get-ga-stats\index.ts
```

---

## 2️⃣ Supabase에 배포

```bash
npx supabase functions deploy get-ga-stats
```

---

## 3️⃣ 테스트

브라우저에서 아래 URL 접속:

```
https://[YOUR-PROJECT-REF].supabase.co/functions/v1/get-ga-stats?region=both
```

예상 응답:
```json
{
  "success": true,
  "data": {
    "domestic": {
      "today": 342,
      "yesterday": 289,
      "last7Days": 2156,
      ...
    },
    "international": {
      "today": 87,
      "yesterday": 72,
      ...
    }
  },
  "timestamp": "2026-06-05T..."
}
```

---

## 4️⃣ 나중에 원본으로 복구

Google Analytics 권한 문제 해결 후:

```bash
# 원본 복구
copy supabase\functions\get-ga-stats\index-original.ts supabase\functions\get-ga-stats\index.ts

# 다시 배포
npx supabase functions deploy get-ga-stats
```

---

## ✅ 장점

1. **UI 테스트 가능** - 프론트엔드가 제대로 작동하는지 확인
2. **Google Analytics 문제는 나중에** - 권한 설정은 시간이 걸리므로 별도 처리
3. **빠른 개발** - 막혀있던 작업 진행 가능

---

## 🔍 Mock 데이터 커스터마이징

`index-mock.ts` 파일에서 숫자를 원하는 대로 수정 가능:

```typescript
const mockDomesticStats = {
  today: 500,        // 오늘 방문자
  yesterday: 450,    // 어제 방문자
  last7Days: 3000,   // 최근 7일
  // ...
}
```
