# 🔍 Edge Function 로그 확인 가이드

## ❌ 현재 상황
- 함수 배포는 성공했지만 404 에러 발생
- 함수가 실제로 활성화되지 않았을 가능성

## ✅ 확인 방법

### 1. Supabase Dashboard에서 로그 확인
1. https://supabase.com/dashboard 접속
2. 프로젝트 `qmhxnxnaawtjelqlgyig` 선택
3. 왼쪽 메뉴 **Edge Functions** 클릭
4. `sync-stibee-subscribers` 함수 클릭
5. 상단 탭에서 **Logs** 클릭
6. 최근 에러 메시지 확인

### 2. 함수 상태 확인
- **Deployments** 탭에서:
  - 최근 배포가 **Active** 상태인지 확인
  - 배포 시간 확인
  - 에러 메시지가 있는지 확인

### 3. 가능한 원인

#### 원인 1: 함수가 실제로 배포되지 않음
- 증상: Deployments 탭에 배포 기록이 없음
- 해결: 함수를 다시 배포

#### 원인 2: 함수 이름 오타
- 증상: 함수 목록에 다른 이름으로 표시됨
- 해결: 정확한 함수 이름 확인 후 URL 수정

#### 원인 3: 환경 변수 누락
- 증상: 함수는 있지만 500 에러 발생
- 해결: Settings → Secrets에서 환경 변수 확인

#### 원인 4: 함수가 비활성화됨
- 증상: 함수가 회색으로 표시되거나 Paused 상태
- 해결: 함수 재시작

### 4. 스크린샷 요청사항

다음 화면을 캡처해서 보여주세요:
1. **Edge Functions 목록 화면** (함수 3개가 모두 보이는 화면)
2. **sync-stibee-subscribers 함수의 Deployments 탭**
3. **sync-stibee-subscribers 함수의 Logs 탭**

---

## 💡 임시 해결책

함수가 정말 존재하지 않는다면, Supabase CLI로 배포해야 할 수도 있습니다.

### Supabase CLI 설치 (필요시)
```powershell
# npm이 설치되어 있다면
npm install -g supabase

# 또는 Chocolatey가 있다면
choco install supabase
```

### CLI로 함수 배포
```powershell
cd hokex-front
supabase login
supabase link --project-ref qmhxnxnaawtjelqlgyig
supabase functions deploy sync-stibee-subscribers
```

하지만 먼저 Dashboard에서 로그를 확인하는 것이 우선입니다.
