# Gmail SMTP 설정 가이드

Supabase 무료 플랜의 이메일 전송 제한(시간당 3-4개)을 해결하기 위해 Gmail SMTP를 설정합니다.

## 📊 비교

| 항목 | Supabase 기본 | Gmail SMTP |
|------|--------------|------------|
| 시간당 제한 | 3-4개 | 제한 없음 |
| 하루 제한 | ~30개 | 500개 |
| 설정 | 불필요 | 5분 소요 |
| 비용 | 무료 | 무료 |
| 발신자 | noreply@mail.app.supabase.io | your-email@gmail.com |

## 🎯 1단계: Gmail 앱 비밀번호 생성

### 1-1. Google 계정 2단계 인증 활성화

1. https://myaccount.google.com/security 접속
2. "2단계 인증" 클릭
3. 안내에 따라 2단계 인증 활성화

### 1-2. 앱 비밀번호 생성

1. https://myaccount.google.com/apppasswords 접속
2. "앱 선택" → "기타(맞춤 이름)" 선택
3. 이름 입력: `Supabase HOKEX`
4. "생성" 클릭
5. **16자리 비밀번호 복사** (예: `abcd efgh ijkl mnop`)
   - ⚠️ 이 비밀번호는 다시 볼 수 없으니 안전한 곳에 저장하세요!

## 🔧 2단계: Supabase SMTP 설정

### 2-1. Supabase Dashboard 접속

1. https://supabase.com/dashboard 로그인
2. 프로젝트 선택
3. 왼쪽 메뉴: **Authentication** → **Email** 클릭

### 2-2. SMTP Settings 입력

**"Enable Custom SMTP"** 토글을 켜고 아래 정보 입력:

```
Sender email: your-email@gmail.com
Sender name: HOKEX

Host: smtp.gmail.com
Port number: 587

Username: your-email@gmail.com
Password: [1단계에서 생성한 16자리 앱 비밀번호]
```

**⚠️ 주의사항:**
- `your-email@gmail.com`을 실제 Gmail 주소로 변경
- Password는 Gmail 로그인 비밀번호가 **아닌** 앱 비밀번호 사용
- 공백 없이 16자리 그대로 입력 (예: `abcdefghijklmnop`)

### 2-3. 저장

- **"Save"** 버튼 클릭
- 설정이 즉시 적용됩니다

## ✅ 3단계: 테스트

### 3-1. 로그인 테스트

1. https://hokex.vercel.app 접속
2. 로그아웃 상태에서 이메일 로그인 시도
3. 이메일 수신 확인

### 3-2. 발신자 확인

받은 이메일에서 발신자 확인:
```
발신자: HOKEX <your-email@gmail.com>
```

### 3-3. Edge Function Logs 확인

Supabase Dashboard → Edge Functions → Logs:
- 로그인 시도 로그 확인
- 에러 없이 성공하는지 확인

## 🎉 완료!

이제 하루 500개까지 이메일을 보낼 수 있습니다.

## 🔍 문제 해결

### Q: "인증 실패" 에러가 발생합니다

**원인:** 앱 비밀번호가 잘못되었거나 2단계 인증이 비활성화됨

**해결:**
1. 2단계 인증이 활성화되어 있는지 확인
2. 앱 비밀번호를 새로 생성
3. 공백 없이 16자리 그대로 입력

### Q: 이메일이 스팸함으로 갑니다

**원인:** Gmail 발신자 평판 문제

**해결:**
1. 수신자에게 스팸 해제 요청
2. 발신자를 연락처에 추가하도록 안내
3. 장기적으로는 커스텀 도메인 사용 권장

### Q: "일일 전송 한도 초과" 에러

**원인:** Gmail 하루 500개 제한 초과

**해결:**
1. 24시간 기다리기
2. SendGrid 같은 전문 서비스로 전환
3. Supabase Pro 플랜 고려

### Q: 발신자 이메일을 변경하고 싶습니다

**방법 1: 다른 Gmail 계정 사용**
- 새 Gmail 계정 생성
- 해당 계정으로 SMTP 설정

**방법 2: 커스텀 도메인 사용**
- Google Workspace 가입 (유료)
- `noreply@hokex.com` 같은 전문적인 이메일 사용

## 📝 참고사항

### Gmail SMTP 제한

- **하루 500개**: 24시간 동안 500개 이메일 발송 가능
- **분당 제한**: 너무 빠르게 보내면 일시 차단될 수 있음
- **스팸 정책**: Gmail 스팸 정책 준수 필요

### 보안

- 앱 비밀번호는 Gmail 로그인 비밀번호와 다름
- 앱 비밀번호가 노출되면 즉시 삭제하고 새로 생성
- Supabase Dashboard는 안전하게 관리됨

### 대안

**더 많은 이메일이 필요한 경우:**

1. **SendGrid** (무료: 하루 100개)
   - 전문 이메일 서비스
   - 높은 전달률
   - 설정 약간 복잡

2. **AWS SES** (거의 무료: 월 62,000개)
   - 가장 많은 무료 할당량
   - AWS 계정 필요
   - 설정 복잡

3. **Supabase Pro** ($25/월)
   - 무제한 이메일
   - 추가 기능 제공
   - 관리 편의성

## 🔗 관련 문서

- [Supabase SMTP 설정 공식 문서](https://supabase.com/docs/guides/auth/auth-smtp)
- [Gmail 앱 비밀번호 생성](https://support.google.com/accounts/answer/185833)
- [Google 2단계 인증](https://www.google.com/landing/2step/)

## 📞 지원

문제가 계속되면:
1. Supabase Dashboard → Edge Functions → Logs 확인
2. 에러 메시지 복사
3. Supabase Discord 또는 GitHub Issues에 문의
