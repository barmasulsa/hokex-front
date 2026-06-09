# Google Analytics 4 권한 문제 - 직접 해결 방법

## 🚨 현재 상황

Google Analytics UI에서 Service Account(`hokex-analytics@hokex-498415.iam.gserviceaccount.com`)를 추가하려고 하면:
- "이메일이 일치하지 않습니다" 경고가 나타남
- 경고를 무시해도 **실제로 추가가 안 됨**
- 속성 액세스 관리 목록에 Service Account가 나타나지 않음

**원인:** 개인 Gmail 계정으로는 Google Analytics UI에서 Service Account를 직접 추가할 수 없습니다.

---

## ✅ 해결 방법 1: Google Cloud Console IAM (프로젝트 레벨)

Google Analytics 속성에 직접 추가가 안 되므로, **Google Cloud 프로젝트 레벨에서 Analytics 권한**을 부여합니다.

### 1-1. Google Cloud Console IAM 접속

1. 브라우저에서 접속:
   ```
   https://console.cloud.google.com/iam-admin/iam?project=hokex-498415
   ```

2. Google 계정 로그인

### 1-2. Service Account에 역할 추가

1. **IAM 페이지에서 Service Account 찾기**
   - 목록에서 `hokex-analytics@hokex-498415.iam.gserviceaccount.com` 찾기
   - 오른쪽 연필 아이콘 (편집) 클릭

2. **역할 추가**
   - "다른 역할 추가" 클릭
   - 다음 역할 추가:
     - **Analytics Admin** (`roles/analytics.admin`) - 또는
     - **Analytics Editor** (`roles/analytics.edit`) - 또는
     - **Analytics Viewer** (`roles/analytics.viewer`)

3. **저장** 클릭

### ⚠️ 문제: 이 방법도 작동하지 않을 수 있음

프로젝트 레벨 IAM 역할은 **Google Analytics 속성별 권한과 다릅니다**.

Google Analytics Data API는 **속성 레벨 권한**을 확인하므로, 프로젝트 레벨 역할만으로는 부족할 수 있습니다.

---

## ✅ 해결 방법 2: BigQuery 연동 (가장 확실함) ⭐⭐⭐

Google Analytics UI에서 Service Account 추가가 안 되면, **BigQuery를 통한 데이터 접근**이 **가장 확실한 해결책**입니다.

### 2-1. GA4에서 BigQuery 연동

1. **Google Analytics 접속**
   ```
   https://analytics.google.com/
   ```

2. **왼쪽 하단 ⚙️ "관리" 클릭**

3. **"속성" 열에서 "BigQuery 링크" 클릭**

4. **오른쪽 상단 "링크" 버튼 클릭**

5. **Google Cloud 프로젝트 선택**
   - 프로젝트: **hokex-498415** 선택
   - "확인" 클릭

6. **데이터 스트림 선택**
   - 연결할 데이터 스트림 체크
   - "다음" 클릭

7. **빈도 설정**
   - **매일** (Daily) 선택 ✅ (무료)
   - "다음" 클릭

8. **제출**
   - "제출" 클릭
   - 완료! 🎉

### 2-2. Service Account에 BigQuery 권한 부여

1. **Google Cloud Console IAM 접속**
   ```
   https://console.cloud.google.com/iam-admin/iam?project=hokex-498415
   ```

2. **Service Account 편집**
   - `hokex-analytics@hokex-498415.iam.gserviceaccount.com` 찾기
   - 오른쪽 연필 아이콘 클릭

3. **역할 추가**
   - "다른 역할 추가" 클릭
   - 다음 역할 2개 추가:
     - **BigQuery 데이터 뷰어** (`roles/bigquery.dataViewer`)
     - **BigQuery 사용자** (`roles/bigquery.user`)

4. **저장** 클릭

### 2-3. BigQuery 데이터 확인 (24시간 후)

BigQuery 연동 후 **최소 24시간**이 지나야 데이터가 채워집니다.

1. **BigQuery Console 접속**
   ```
   https://console.cloud.google.com/bigquery?project=hokex-498415
   ```

2. **데이터셋 확인**
   - 왼쪽 탐색기에서 `hokex-498415` 프로젝트 확장
   - `analytics_538348093` 데이터셋이 생성되었는지 확인
   - `events_YYYYMMDD` 테이블들이 있는지 확인

### 2-4. Edge Function 코드 수정 필요

BigQuery를 사용하려면 Edge Function 코드를 수정해야 합니다.

**하지만 일단 BigQuery 연동만 먼저 완료하세요!**

코드 수정은 BigQuery에 데이터가 쌓인 후에 하겠습니다.

---

## ✅ 해결 방법 3: OAuth 2.0 사용자 인증 (임시 해결책)

Service Account 대신 **본인의 Google 계정**으로 인증하는 방법입니다.

### 장점:
- 즉시 작동 가능
- 권한 문제 없음

### 단점:
- 매번 로그인 필요 (또는 Refresh Token 필요)
- Service Account보다 보안성 낮음
- 장기적으로 권장되지 않음

### 구현 방법:

이 방법은 복잡하므로, **BigQuery 방법을 먼저 시도**하세요!

---

## 🧪 다음 단계

### 즉시 할 일:

**BigQuery 연동을 진행하세요:**

1. Google Analytics → 관리 → BigQuery 링크 → 링크
2. 프로젝트 `hokex-498415` 선택
3. 데이터 스트림 선택
4. 매일 전송 선택
5. 제출

**Service Account에 BigQuery 권한 추가:**

1. Google Cloud Console → IAM
2. `hokex-analytics@hokex-498415.iam.gserviceaccount.com` 편집
3. 역할 추가:
   - BigQuery 데이터 뷰어
   - BigQuery 사용자
4. 저장

### 24시간 후:

BigQuery에 데이터가 쌓이면, Edge Function 코드를 수정하겠습니다.

---

## 💡 왜 BigQuery가 더 나은가?

1. **Service Account 권한 설정이 훨씬 쉬움**
   - Google Analytics UI에서 직접 추가할 필요 없음
   - Google Cloud IAM에서 표준 역할 부여만 하면 됨

2. **더 강력한 데이터 접근**
   - GA4 Data API보다 더 유연한 쿼리 가능
   - 더 많은 데이터 포인트에 접근 가능

3. **비용 효율적**
   - 매일 전송은 무료
   - 쿼리 비용도 미미함 (월 1TB 무료)

4. **장기적으로 더 유리**
   - 데이터 백업 및 분석에 활용 가능
   - 다른 도구와 통합 쉬움

---

## 🚀 지금 바로 시작

1. **Google Analytics** 접속: https://analytics.google.com/
2. **관리 → BigQuery 링크** 클릭
3. **"링크"** 버튼 클릭
4. **프로젝트 `hokex-498415` 선택**
5. **매일 전송 선택**
6. **제출**

그리고 24시간 기다리세요! 🎉

---

## 📞 다음 단계 도움

BigQuery 연동이 완료되면 알려주세요.

Edge Function 코드를 BigQuery 버전으로 수정해드리겠습니다! 🚀
