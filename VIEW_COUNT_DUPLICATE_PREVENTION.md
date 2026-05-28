# 조회수 중복 방지 시스템

## 📋 개요

공지사항(행사) 조회수 시스템에 중복 방지 기능을 추가했습니다. 일반 사용자는 세션당 1회만 조회수가 카운트되며, 관리자는 예외로 매번 카운트됩니다.

## ✅ 구현 완료 사항

### 1. 중복 방지 로직
- **위치**: `hokex-front/src/services/eventService.ts` → `incrementViewCount()` 함수
- **방식**: `sessionStorage` 기반 중복 체크
- **키 형식**: `event_viewed_{eventId}`

### 2. 관리자 예외 처리
- **관리자 이메일**: `lcw55@naver.com` (하드코딩)
- **동작**: 관리자는 중복 방지 로직을 우회하여 매번 조회수 증가
- **목적**: 관리자가 조회수 증가를 실시간으로 확인 가능

### 3. 기존 시스템 유지
- **DB RPC 함수**: `increment_event_view_count` 그대로 유지
- **DB 테이블**: `event_views_log`, `events.view_count` 변경 없음
- **프론트엔드 호출**: `EventDetailPage.tsx`에서 기존 방식 유지

## 🔧 작동 방식

### 일반 사용자 (비로그인 포함)
```
1. 행사 상세 페이지 접속
2. incrementViewCount(eventId) 호출
3. sessionStorage에서 `event_viewed_{eventId}` 확인
4. 없으면 → 조회수 증가 + sessionStorage에 기록
5. 있으면 → 조회수 증가 안 함 (이미 본 행사)
```

### 관리자 (lcw55@naver.com)
```
1. 행사 상세 페이지 접속
2. incrementViewCount(eventId) 호출
3. 이메일이 관리자인지 확인
4. 관리자면 → sessionStorage 체크 없이 바로 조회수 증가
5. 매번 조회수가 올라가므로 실시간 확인 가능
```

## 📊 중복 방지 범위

| 상황 | 조회수 증가 여부 |
|------|-----------------|
| 같은 브라우저 탭에서 새로고침 | ❌ 증가 안 함 (세션 유지) |
| 같은 브라우저에서 새 탭 열기 | ❌ 증가 안 함 (세션 공유) |
| 다른 브라우저에서 접속 | ✅ 증가 (세션 다름) |
| 시크릿 모드에서 접속 | ✅ 증가 (세션 다름) |
| 브라우저 완전 종료 후 재접속 | ✅ 증가 (세션 초기화) |
| 관리자 (lcw55@naver.com) | ✅ 항상 증가 |

## 🔍 코드 변경 사항

### Before (중복 방지 없음)
```typescript
export async function incrementViewCount(eventId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.rpc('increment_event_view_count', {
      p_event_id: eventId,
      p_user_id: user?.id || null
    });

    if (error) {
      console.error(`[ViewCount] Error incrementing view count for event ${eventId}:`, error);
    } else {
      console.log(`[ViewCount] Successfully incremented view count for event ${eventId}`);
    }
  } catch (err) {
    console.error(`[ViewCount] Exception incrementing view count:`, err);
  }
}
```

### After (중복 방지 + 관리자 예외)
```typescript
export async function incrementViewCount(eventId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // 관리자 이메일 (하드코딩)
    const ADMIN_EMAIL = 'lcw55@naver.com';
    
    // 관리자 여부 확인
    const isAdmin = user?.email === ADMIN_EMAIL;
    
    // 관리자가 아닌 경우 중복 방지 체크
    if (!isAdmin) {
      const viewedKey = `event_viewed_${eventId}`;
      const hasViewed = sessionStorage.getItem(viewedKey);
      
      if (hasViewed) {
        console.log(`[ViewCount] Already viewed event ${eventId} in this session (non-admin)`);
        return;
      }
      
      // 세션에 조회 기록 저장
      sessionStorage.setItem(viewedKey, 'true');
    } else {
      console.log(`[ViewCount] Admin user - bypassing duplicate check for event ${eventId}`);
    }
    
    const { error } = await supabase.rpc('increment_event_view_count', {
      p_event_id: eventId,
      p_user_id: user?.id || null
    });

    if (error) {
      console.error(`[ViewCount] Error incrementing view count for event ${eventId}:`, error);
    } else {
      console.log(`[ViewCount] Successfully incremented view count for event ${eventId}`);
    }
  } catch (err) {
    console.error(`[ViewCount] Exception incrementing view count:`, err);
  }
}
```

## 🧪 테스트 방법

### 일반 사용자 테스트
1. 비로그인 상태 또는 일반 계정으로 로그인
2. 행사 상세 페이지 접속
3. 조회수 확인 (1 증가)
4. 새로고침 (F5)
5. 조회수 확인 (증가 안 함)
6. 브라우저 개발자 도구 → Application → Session Storage 확인
   - `event_viewed_{eventId}` 키가 있어야 함

### 관리자 테스트
1. `lcw55@naver.com` 계정으로 로그인
2. 행사 상세 페이지 접속
3. 조회수 확인 (1 증가)
4. 새로고침 (F5)
5. 조회수 확인 (1 더 증가) ← 관리자는 매번 증가
6. 브라우저 콘솔에서 로그 확인
   - `[ViewCount] Admin user - bypassing duplicate check for event {eventId}` 메시지 확인

## 📝 주의사항

1. **sessionStorage 사용**: 브라우저 탭/창을 닫으면 초기화됨
2. **관리자 이메일 하드코딩**: 보안상 민감하지 않은 정보이므로 하드코딩 사용
3. **DB 레벨 변경 없음**: 기존 RPC 함수와 테이블 구조는 그대로 유지
4. **로그인 불필요**: 비로그인 사용자도 중복 방지 적용됨

## 🚀 배포 방법

1. 변경된 파일 커밋:
   ```bash
   git add hokex-front/src/services/eventService.ts
   git commit -m "feat: 조회수 중복 방지 구현 (관리자 예외)"
   ```

2. Vercel에 배포:
   ```bash
   git push origin main
   ```

3. 배포 완료 후 테스트:
   - 일반 사용자로 중복 방지 확인
   - 관리자 계정으로 예외 처리 확인

## ✅ 완료 체크리스트

- [x] `incrementViewCount()` 함수에 중복 방지 로직 추가
- [x] sessionStorage 기반 중복 체크 구현
- [x] 관리자 이메일 예외 처리 추가
- [x] 기존 DB RPC 함수 유지
- [x] 문서 작성 완료

## 📚 관련 문서

- `VIEW_COUNT_SYSTEM_EXPLANATION.md` - 조회수 시스템 전체 설명
- `setup-and-migrate-view-logs-complete.sql` - DB 스키마 및 RPC 함수
- `hokex-front/src/pages/EventDetailPage.tsx` - 조회수 증가 호출 위치
