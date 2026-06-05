# GA4 Permission 문제 해결 가이드

## 🚨 현재 에러

```
Error: GA4 API Error: {
  "error": {
    "code": 403,
    "message": "User does not have sufficient permissions for this property.",
    "status": "PERMISSION_DENIED"
  }
}
```

## ✅ 해결 방법

Service Account를 Google Analytics에 추가해야 합니다.

### 1. Google Analytics 접속
- URL: https://analytics.google.com/
- 로그인

### 2. 속성 액세스 관리
1. 왼쪽 하단 ⚙️ **"관리"** 클릭
2. **"속성"** 열에서 **"속성 액세스 관리"** 클릭  
3. 오른쪽 상단 ➕ **"추가"** 버튼 클릭

### 3. Service Account 추가
**이메일 주소:**
```
hokex-analytics@hokex-498415.iam.gserviceaccount.com
```

**역할:**
- ✅ **뷰어 (Viewer)** 체크

**"추가"** 클릭

### 4. 확인
목록에서 Service Account 이메일이 추가되었는지 확인

---

## ⚠️ 경고 메시지가 나타나는 경우

**"이메일이 Google 계정과 일치하지 않습니다"** 경고가 나타날 수 있습니다.

**이것은 정상입니다!** Service Account는 일반 Google 계정이 아닙니다.

**해결:**
- 경고를 무시하고 "추가" 버튼을 눌러주세요
- 또는 "Viewer" 권한을 선택한 후 "알림 없이 추가" 또는 "확인" 선택

---

## 🧪 테스트

Service Account 추가 후:

1. **Edge Function 테스트**
   - Supabase Dashboard → Edge Functions → `get-ga-stats` → "Invoke" 클릭
   - 로그에서 성공 여부 확인

2. **프론트엔드 테스트**
   - 방문자 통계 페이지 새로고침
   - Google Analytics 데이터가 표시되는지 확인

---

## 📋 체크리스트

- [ ] Google Analytics 접속 완료
- [ ] 속성 액세스 관리 페이지 열기 완료
- [ ] Service Account 이메일 입력 완료
- [ ] "뷰어" 역할 선택 완료
- [ ] "추가" 버튼 클릭 완료
- [ ] 목록에서 Service Account 확인 완료
- [ ] Edge Function 테스트 완료
- [ ] 프론트엔드 동작 확인 완료

---

## 🔗 참고 링크

- Google Analytics 관리: https://analytics.google.com/
- Service Account: `hokex-analytics@hokex-498415.iam.gserviceaccount.com`
- Property ID: `538348093`
