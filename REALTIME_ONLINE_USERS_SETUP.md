# Supabase Realtime 현재 접속 인원 추적 설정 가이드

## 개요

Supabase Realtime을 사용하여 현재 접속 중인 사용자 수를 실시간으로 추적하고 표시합니다.

## 비용

### 무료 플랜 (Free Tier)
- ✅ 동시 연결: 최대 200개
- ✅ 메시지: 월 200만 개
- ✅ 대부분의 소규모 프로젝트에 충분

### Pro 플랜 ($25/월)
- 동시 연결: 최대 500개
- 메시지: 월 500만 개

**현재 HOKEX 프로젝트는 무료 플랜으로 충분합니다!**

## 설정 단계

### 1. Supabase에서 테이블 생성

Supabase SQL Editor에서 다음 SQL 실행:

```sql
-- 파일: supabase-migrations/create-online-users-table.sql
```

이 SQL은 다음을 수행합니다:
- `online_users` 테이블 생성
- RLS (Row Level Security) 정책 설정
- Realtime 활성화
- 자동 정리 함수 생성

### 2. Realtime 활성화 확인

Supabase 대시보드에서:
1. Database → Replication 메뉴로 이동
2. `online_users` 테이블이 활성화되어 있는지 확인
3. 활성화되어 있지 않다면 토글 버튼 클릭

### 3. 프론트엔드 코드 배포

이미 구현된 파일들:
- `src/utils/onlinePresence.ts` - Presence 관리 유틸리티
- `src/pages/HomePage.tsx` - 현재 접속 인원 표시
- `src/App.css` - 온라인 인디케이터 스타일

### 4. 테스트

1. 로컬에서 개발 서버 실행:
   ```bash
   npm run dev
   ```

2. 여러 브라우저 탭에서 홈페이지 열기

3. 오른쪽 사이드바에서 "현재 접속" 숫자가 실시간으로 변경되는지 확인

4. 탭을 닫으면 숫자가 감소하는지 확인

## 작동 원리

### 1. 세션 추적
- 사용자가 홈페이지에 접속하면 고유한 세션 ID 생성
- `sessionStorage`에 저장 (탭마다 다른 ID)

### 2. Heartbeat
- 10초마다 `last_seen` 타임스탬프 업데이트
- 사용자가 활동 중임을 표시

### 3. 자동 정리
- 30초 이상 활동이 없는 세션 자동 삭제
- 클라이언트와 서버 양쪽에서 정리

### 4. Realtime 구독
- Supabase Realtime으로 `online_users` 테이블 변경 감지
- 변경 발생 시 현재 접속자 수 자동 업데이트

### 5. 페이지 종료 처리
- `beforeunload` 이벤트로 세션 삭제
- `navigator.sendBeacon`으로 비동기 전송

## 주요 기능

### PresenceManager 클래스

```typescript
const presenceManager = new PresenceManager();

// 시작
await presenceManager.start((count) => {
  console.log('현재 접속 인원:', count);
});

// 정지
await presenceManager.stop();
```

### 주요 함수

- `getOnlineCount()` - 현재 접속자 수 가져오기
- `recordPresence()` - 접속 기록 (upsert)
- `removePresence()` - 접속 종료
- `cleanupInactiveSessions()` - 비활성 세션 정리
- `subscribeToOnlineUsers()` - Realtime 구독

## UI 표시

홈페이지 오른쪽 사이드바에 표시:

```
📊 방문자 통계

┌─────────────────┐
│ 🟢 현재 접속    │
│      5          │
│   명 온라인     │
└─────────────────┘

┌─────────────────┐
│    오늘         │
│     123         │
│   명 방문       │
└─────────────────┘
```

- 초록색 그라데이션 배경
- 깜빡이는 온라인 인디케이터 (🟢)
- 실시간 업데이트

## 문제 해결

### 접속자 수가 0으로 표시됨

1. Supabase에서 Realtime이 활성화되어 있는지 확인
2. RLS 정책이 올바르게 설정되어 있는지 확인
3. 브라우저 콘솔에서 에러 메시지 확인

### 접속자 수가 감소하지 않음

1. 30초 대기 (자동 정리 주기)
2. `cleanupInactiveSessions()` 함수가 실행되는지 확인
3. Supabase에서 `online_users` 테이블 직접 확인

### Realtime 연결 실패

1. Supabase 프로젝트 URL과 anon key 확인
2. 네트워크 연결 확인
3. Supabase 대시보드에서 프로젝트 상태 확인

## 성능 최적화

### 현재 설정
- Heartbeat 간격: 10초
- 세션 타임아웃: 30초
- 정리 주기: 30초

### 조정 가능한 값

더 정확한 추적이 필요하면:
```typescript
// onlinePresence.ts에서 수정
this.heartbeatInterval = setInterval(() => {
  recordPresence();
}, 5000); // 5초로 변경
```

더 긴 타임아웃이 필요하면:
```typescript
// SQL에서 수정
WHERE last_seen < NOW() - INTERVAL '60 seconds'; -- 60초로 변경
```

## 배포

### Vercel 배포

```bash
git add .
git commit -m "feat: add realtime online users tracking with Supabase"
git push origin main
```

Vercel이 자동으로 배포합니다.

### Supabase 마이그레이션

프로덕션 Supabase에서:
1. SQL Editor 열기
2. `create-online-users-table.sql` 내용 복사
3. 실행
4. Realtime 활성화 확인

## 모니터링

### Supabase 대시보드

1. Database → Tables → `online_users`
   - 현재 활성 세션 확인

2. Database → Replication
   - Realtime 메시지 수 확인

3. Settings → Usage
   - Realtime 사용량 모니터링

### 로그 확인

브라우저 콘솔에서:
```javascript
// 현재 접속자 수 확인
const count = await getOnlineCount();
console.log('현재 접속:', count);

// 세션 ID 확인
console.log('세션 ID:', sessionStorage.getItem('hokex_session_id'));
```

## 추가 기능 아이디어

### 1. 지역별 접속자 표시
```typescript
interface OnlineUser {
  session_id: string;
  region: string; // 사용자 선택 지역
  last_seen: string;
}
```

### 2. 페이지별 접속자 표시
```typescript
interface OnlineUser {
  session_id: string;
  current_page: string; // '/home', '/event/123'
  last_seen: string;
}
```

### 3. 접속자 목록 표시 (관리자 전용)
```typescript
// 익명 사용자 목록
const users = await getOnlineUsers();
// [{ id: 'user_1', lastSeen: '2026-05-18T10:30:00Z' }, ...]
```

## 참고 자료

- [Supabase Realtime 문서](https://supabase.com/docs/guides/realtime)
- [Supabase Presence 가이드](https://supabase.com/docs/guides/realtime/presence)
- [Supabase 가격 정책](https://supabase.com/pricing)

## 요약

✅ **완전 무료** (무료 플랜 범위 내)
✅ **실시간 업데이트** (Supabase Realtime)
✅ **자동 정리** (30초 타임아웃)
✅ **간단한 구현** (PresenceManager 클래스)
✅ **확장 가능** (지역별, 페이지별 추적 가능)

현재 접속 인원 추적 기능이 성공적으로 구현되었습니다!
