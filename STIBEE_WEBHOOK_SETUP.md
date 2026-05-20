# Stibee 웹훅 설정 가이드

## 개요
Stibee에서 새 구독자가 생기거나 구독 취소가 발생하면 자동으로 DB에 실시간 반영됩니다.

## 설정 순서

### 1단계: Supabase에서 웹훅 URL 확인

1. Supabase Dashboard 로그인
2. 프로젝트 선택
3. Settings → API → Project URL 확인

웹훅 URL 형식:
```
https://[YOUR-PROJECT-ID].supabase.co/functions/v1/stibee-webhook
```

예시:
```
https://abcdefghijklmnop.supabase.co/functions/v1/stibee-webhook
```

### 2단계: Stibee 대시보드에서 웹훅 설정

1. **Stibee 로그인** (https://stibee.com)
2. **주소록 선택** (구독자를 관리하는 주소록)
3. **설정 → 웹훅 (Webhook)** 메뉴로 이동
4. **"웹훅 추가"** 클릭
5. 다음 정보 입력:
   - **웹훅 URL**: `https://[YOUR-PROJECT-ID].supabase.co/functions/v1/stibee-webhook`
   - **이벤트 선택**:
     - ✅ **구독** (subscribe/SUBSCRIBED)
     - ✅ **구독 취소** (unsubscribe/UNSUBSCRIBED)
   - **HTTP 메서드**: POST
   - **Content-Type**: application/json
6. **저장** 클릭


### 3단계: 웹훅 테스트

#### 방법 1: Stibee에서 테스트 구독자 추가

1. Stibee 주소록에서 테스트 이메일 추가
2. Supabase Dashboard → Edge Functions → Logs 확인
3. 로그에서 확인:
   ```
   Stibee webhook received: { eventOccuredBy: 'subscribe', subscriber: { email: 'test@example.com' } }
   Subscriber added/updated: test@example.com
   ```

#### 방법 2: curl로 직접 테스트

```bash
curl -X POST \
  https://[YOUR-PROJECT-ID].supabase.co/functions/v1/stibee-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "eventOccuredBy": "subscribe",
    "subscriber": {
      "email": "test@example.com"
    }
  }'
```

예상 응답:
```json
{
  "success": true,
  "message": "Subscriber synced",
  "email": "test@example.com"
}
```

#### 방법 3: DB에서 확인

Supabase Dashboard → Table Editor → `stibee_subscribers`:

```sql
SELECT * FROM stibee_subscribers 
WHERE email = 'test@example.com'
ORDER BY subscribed_at DESC;
```

---

## 작동 방식

### 구독 이벤트 (subscribe/SUBSCRIBED)
1. Stibee에서 새 구독자 추가
2. 웹훅이 자동으로 Edge Function 호출
3. DB에 이메일 추가 (중복 시 업데이트)
4. 즉시 로그인 가능

### 구독 취소 이벤트 (unsubscribe/UNSUBSCRIBED)
1. Stibee에서 구독 취소
2. 웹훅이 자동으로 Edge Function 호출
3. DB에서 이메일 삭제
4. 로그인 불가

## 기존 동기화 시스템과의 관계

### 웹훅 (실시간)
- **용도**: 새 구독자 즉시 반영
- **장점**: 실시간, 빠름
- **단점**: 웹훅 실패 시 누락 가능

### 배치 동기화 (주기적)
- **용도**: 전체 구독자 목록 동기화
- **장점**: 누락 방지, 백업
- **단점**: 최대 1시간 지연

### 권장 설정
- **웹훅**: 실시간 동기화 (이 가이드)
- **배치 동기화**: 매일 1회 (새벽 3시) - 백업용


## 문제 해결

### Q: 웹훅이 호출되지 않습니다

**확인 사항:**

1. **Stibee 웹훅 설정 확인**
   - URL이 정확한지 확인 (https로 시작, /functions/v1/stibee-webhook로 끝남)
   - 이벤트가 선택되어 있는지 확인
   - 웹훅이 활성화되어 있는지 확인

2. **Edge Function 상태 확인**
   - Supabase Dashboard → Edge Functions
   - `stibee-webhook` 함수가 배포되어 있는지 확인
   - Logs에서 에러 메시지 확인

3. **네트워크 확인**
   - Stibee에서 웹훅 전송 로그 확인
   - HTTP 응답 코드 확인 (200 OK 여야 함)

### Q: 웹훅은 호출되는데 DB에 저장되지 않습니다

**해결 방법:**

1. Edge Function Logs에서 에러 확인
2. DB 권한 확인:
   ```sql
   SELECT * FROM stibee_subscribers LIMIT 1;
   ```
3. 수동으로 추가 테스트:
   ```sql
   INSERT INTO stibee_subscribers (email, subscribed_at, source)
   VALUES ('test@example.com', NOW(), 'manual');
   ```

### Q: 구독 취소했는데 여전히 로그인됩니다

**해결 방법:**

1. 웹훅이 구독 취소 이벤트를 받았는지 확인 (Edge Function Logs)
2. DB에서 수동 삭제:
   ```sql
   DELETE FROM stibee_subscribers WHERE email = 'test@example.com';
   ```

### Q: "올바른 URL이 아니라는데" 에러

**해결 방법:**

1. URL 형식 확인:
   - ✅ 올바른 형식: `https://abcdefghijklmnop.supabase.co/functions/v1/stibee-webhook`
   - ❌ 잘못된 형식: `http://...` (https 아님)
   - ❌ 잘못된 형식: `https://...supabase.co/functions/v1/functions/v1/stibee-webhook` (중복)

2. Supabase Project URL 다시 확인:
   - Supabase Dashboard → Settings → API → Project URL
   - 복사한 URL 끝에 `/functions/v1/stibee-webhook` 추가

---

## 모니터링

### 웹훅 활동 확인

```sql
-- 최근 웹훅으로 추가된 구독자
SELECT * FROM stibee_subscribers 
WHERE source = 'webhook'
ORDER BY subscribed_at DESC
LIMIT 10;

-- 웹훅 vs 배치 동기화 비율
SELECT 
  source,
  COUNT(*) as count
FROM stibee_subscribers
GROUP BY source;
```

### Edge Function Logs

Supabase Dashboard → Edge Functions → `stibee-webhook` → Logs:
- 웹훅 호출 로그
- 성공/실패 로그
- 에러 메시지

## 보안

### CORS 설정
- 모든 도메인 허용 (`*`)
- Stibee 서버에서만 호출되므로 안전

### 인증
- Stibee 웹훅은 별도 인증 없이 공개 URL
- 악의적 호출 시에도 이메일만 추가되므로 큰 문제 없음
- 필요 시 Stibee에서 제공하는 서명 검증 추가 가능

## 다음 단계

1. ✅ Supabase에서 웹훅 URL 확인
2. ⬜ Stibee 대시보드에서 웹훅 설정
3. ⬜ 테스트 구독자로 검증
4. ⬜ 실제 구독자로 운영 시작

## 참고

- Edge Function은 이미 배포되어 있습니다 (`stibee-webhook`)
- 웹훅은 실시간 동기화를 위한 것입니다
- 배치 동기화 시스템도 함께 운영 중입니다 (백업용)

