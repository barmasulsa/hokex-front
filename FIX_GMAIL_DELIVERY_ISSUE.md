# Gmail 구독 확인 메일 미수신 문제 해결

## 문제 상황
- 네이버, 다음 등 다른 메일은 정상 수신
- **Gmail만** 구독 확인 메일이 안 감
- 스팸함에도 없음

---

## 원인

Gmail은 발신자 인증이 없는 메일을 **자동으로 차단**합니다.

### Gmail이 메일을 차단하는 이유:
1. **SPF 레코드 미설정** - 발신 서버 인증 없음
2. **DKIM 서명 미설정** - 메일 위변조 방지 서명 없음
3. **DMARC 정책 미설정** - 인증 실패 시 처리 방법 없음
4. **발신자 평판 낮음** - 새 도메인이거나 발송량 적음

---

## 해결 방법

### 방법 1: Stibee 도메인 인증 (필수, 추천)

#### 1단계: Stibee에서 도메인 인증 시작
1. https://stibee.com 로그인
2. **설정** → **발신자 이메일** 메뉴
3. **도메인 인증** 탭 클릭
4. 도메인 입력 (예: `hokex.com`)
5. **인증 시작** 버튼 클릭

#### 2단계: DNS 레코드 추가
Stibee가 제공하는 DNS 레코드를 도메인 관리 페이지에 추가:

**SPF 레코드 (TXT):**
```
호스트: @
값: v=spf1 include:_spf.stibee.com ~all
```

**DKIM 레코드 (TXT):**
```
호스트: stibee._domainkey
값: (Stibee가 제공하는 긴 문자열)
```

**DMARC 레코드 (TXT):**
```
호스트: _dmarc
값: v=DMARC1; p=none; rua=mailto:dmarc@hokex.com
```

#### 3단계: DNS 전파 대기
- 시간: 10분 ~ 48시간 (보통 1시간 이내)
- 확인 방법: Stibee 대시보드에서 인증 상태 확인

#### 4단계: 인증 완료 확인
- Stibee 대시보드에서 **인증 완료** 표시 확인
- 테스트 메일 발송 → Gmail 수신 확인

---

### 방법 2: 발신자 이메일 변경 (임시)

도메인 인증이 어려우면 Stibee 기본 도메인 사용:

#### Stibee 설정:
1. **설정** → **발신자 이메일**
2. 발신자 이메일을 Stibee 제공 주소로 변경:
   - 예: `newsletter@mail.stibee.com`
   - 또는: `noreply@stibee.com`

#### 장점:
- 즉시 적용 가능
- Gmail 차단 없음

#### 단점:
- 브랜드 신뢰도 낮음
- 회신 불가능

---

### 방법 3: Gmail 화이트리스트 요청 (보조)

#### 구독자에게 안내:
```
Gmail 사용자분들께:

구독 확인 메일이 수신되지 않는 경우,
아래 방법으로 발신자를 안전한 발신자로 등록해주세요:

1. Gmail 설정 → 필터 및 차단된 주소
2. 새 필터 만들기
3. From: newsletter@hokex.com
4. 필터 만들기 → 스팸으로 보내지 않음 체크
5. 필터 만들기 클릭

감사합니다!
```

---

## DNS 레코드 추가 방법 (도메인 제공업체별)

### Cloudflare
1. Cloudflare 대시보드 로그인
2. 도메인 선택 → **DNS** 메뉴
3. **Add record** 클릭
4. Type: `TXT`
5. Name: `@` (SPF) 또는 `stibee._domainkey` (DKIM)
6. Content: Stibee가 제공한 값 입력
7. **Save** 클릭

### GoDaddy
1. GoDaddy 계정 로그인
2. **내 제품** → 도메인 선택
3. **DNS 관리** 클릭
4. **레코드 추가** 클릭
5. 유형: `TXT`
6. 호스트: `@` 또는 `stibee._domainkey`
7. TXT 값: Stibee가 제공한 값
8. **저장** 클릭

### 가비아
1. 가비아 로그인
2. **My가비아** → **서비스 관리**
3. 도메인 선택 → **DNS 정보** → **DNS 설정**
4. **레코드 추가** 클릭
5. 타입: `TXT`
6. 호스트: `@` 또는 `stibee._domainkey`
7. 값: Stibee가 제공한 값
8. **확인** 클릭

### Cafe24
1. Cafe24 로그인
2. **나의 서비스 관리** → 도메인 관리
3. 도메인 선택 → **DNS 설정**
4. **레코드 추가**
5. 타입: `TXT`
6. 호스트: `@` 또는 `stibee._domainkey`
7. 값: Stibee가 제공한 값
8. **저장**

---

## DNS 설정 확인 방법

### 온라인 도구 사용:
1. https://mxtoolbox.com/spf.aspx 접속
2. 도메인 입력 (예: `hokex.com`)
3. **SPF Record Lookup** 클릭
4. 결과 확인:
   - ✅ `v=spf1 include:_spf.stibee.com ~all` 표시되면 성공

### 명령어 사용 (Mac/Linux):
```bash
# SPF 확인
dig TXT hokex.com +short

# DKIM 확인
dig TXT stibee._domainkey.hokex.com +short

# DMARC 확인
dig TXT _dmarc.hokex.com +short
```

### PowerShell (Windows):
```powershell
# SPF 확인
Resolve-DnsName -Name hokex.com -Type TXT

# DKIM 확인
Resolve-DnsName -Name stibee._domainkey.hokex.com -Type TXT

# DMARC 확인
Resolve-DnsName -Name _dmarc.hokex.com -Type TXT
```

---

## 테스트 방법

### 1. 도메인 인증 후 테스트
1. DNS 레코드 추가 후 1시간 대기
2. Stibee에서 테스트 메일 발송
3. Gmail 계정으로 수신 확인

### 2. Gmail 수신 확인
- **받은편지함**: 정상 수신 ✅
- **스팸함**: 없음 ✅
- **차단됨**: 없음 ✅

### 3. 메일 헤더 확인
Gmail에서 메일 열기 → 점 3개 → **원본 보기**

**확인 사항:**
```
SPF: PASS
DKIM: PASS
DMARC: PASS
```

모두 PASS면 성공!

---

## 문제 해결 체크리스트

### ✅ Stibee 설정
- [ ] 도메인 인증 시작
- [ ] DNS 레코드 추가 (SPF, DKIM, DMARC)
- [ ] DNS 전파 대기 (1시간)
- [ ] Stibee에서 인증 완료 확인

### ✅ DNS 확인
- [ ] SPF 레코드 정상 조회
- [ ] DKIM 레코드 정상 조회
- [ ] DMARC 레코드 정상 조회

### ✅ 테스트
- [ ] Gmail로 테스트 메일 발송
- [ ] 받은편지함 수신 확인
- [ ] 메일 헤더에서 SPF/DKIM/DMARC PASS 확인

---

## 예상 결과

### 도메인 인증 전:
```
Gmail: ❌ 차단 (수신 안 됨)
네이버: ✅ 정상 수신
다음: ✅ 정상 수신
```

### 도메인 인증 후:
```
Gmail: ✅ 정상 수신
네이버: ✅ 정상 수신
다음: ✅ 정상 수신
```

---

## 긴급 임시 조치

도메인 인증이 어렵거나 시간이 없다면:

### 1. Stibee 기본 도메인 사용
- 발신자: `newsletter@mail.stibee.com`
- 즉시 적용, Gmail 정상 수신

### 2. 구독자에게 직접 안내
```
Gmail 사용자분들께:

구독 확인 메일이 수신되지 않는 경우,
newsletter@hokex.com을 연락처에 추가해주세요.

1. Gmail 연락처 추가
2. 이메일: newsletter@hokex.com
3. 저장

감사합니다!
```

---

## 참고 자료

- [Stibee 도메인 인증 가이드](https://help.stibee.com/hc/ko/articles/4402826416665)
- [Gmail 발신자 가이드라인](https://support.google.com/mail/answer/81126)
- [SPF 레코드 설정](https://www.spf-record.com/)
- [DKIM 레코드 설정](https://www.dkim.org/)
- [MXToolbox - DNS 확인](https://mxtoolbox.com/)

---

## 다음 단계

1. ✅ Stibee에서 도메인 인증 시작
2. ✅ DNS 레코드 추가 (SPF, DKIM, DMARC)
3. ⏱️ 1시간 대기 (DNS 전파)
4. ✅ Stibee에서 인증 완료 확인
5. ✅ Gmail로 테스트 메일 발송
6. ✅ 정상 수신 확인

---

## 문의

- Stibee 고객센터: support@stibee.com
- Stibee 헬프센터: https://help.stibee.com
- DNS 설정 문의: 도메인 제공업체 고객센터
