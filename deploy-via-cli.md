# Supabase CLI로 직접 배포하기

Dashboard 배포가 안 되는 경우, CLI로 직접 배포할 수 있습니다.

## 1. Supabase CLI 설치 확인

```powershell
supabase --version
```

없으면 설치:
```powershell
npm install -g supabase
```

## 2. 로그인

```powershell
supabase login
```

## 3. 프로젝트 링크

```powershell
cd hokex-front
supabase link --project-ref qmhxnxnaawtjelqlgyig
```

## 4. 함수 배포

```powershell
supabase functions deploy sync-stibee-subscribers
```

## 5. 환경 변수 설정 (CLI로)

```powershell
supabase secrets set STIBEE_API_KEY=api52c730f2b04db7709884c860251373efc943ed246be2b1c89b7c15b40201e321a17c5a227662bb24f423699bb5f7b218c198cad81c0c09f4623ed59a94c1c921
supabase secrets set STIBEE_LIST_ID=289942
```

## 6. 테스트

```powershell
$headers = @{"Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaHhueG5hYXd0amVscWxneWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5ODI0NSwiZXhwIjoyMDkyNjc0MjQ1fQ.HtG6kEREE7zzPUuxDhItQjsp2PffT5Z1mDXKBcDElrg"}
Invoke-RestMethod -Uri "https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/sync-stibee-subscribers" -Method POST -Headers $headers -Body '{}'
```
