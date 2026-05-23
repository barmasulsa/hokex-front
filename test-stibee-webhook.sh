#!/bin/bash

# Stibee 웹훅 테스트 스크립트

echo "🧪 Stibee 웹훅 테스트 시작..."
echo ""

# 테스트 이메일
TEST_EMAIL="test-$(date +%s)@example.com"

echo "📧 테스트 이메일: $TEST_EMAIL"
echo ""

# 웹훅 호출
echo "📤 웹훅 호출 중..."
RESPONSE=$(curl -s -X POST \
  https://qmhxnxnaawtjelqlgyig.supabase.co/functions/v1/stibee-webhook \
  -H "Content-Type: application/json" \
  -d "{
    \"eventOccuredBy\": \"subscribe\",
    \"subscriber\": {
      \"email\": \"$TEST_EMAIL\"
    }
  }")

echo "📥 응답:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# 성공 여부 확인
if echo "$RESPONSE" | grep -q "success.*true"; then
  echo "✅ 웹훅 호출 성공!"
  echo ""
  echo "📊 DB 확인 방법:"
  echo "Supabase Dashboard → Table Editor → stibee_subscribers"
  echo "또는 SQL Editor에서:"
  echo "SELECT * FROM stibee_subscribers WHERE email = '$TEST_EMAIL';"
else
  echo "❌ 웹훅 호출 실패"
  echo ""
  echo "🔍 확인 사항:"
  echo "1. Edge Function이 배포되어 있는지 확인"
  echo "2. Supabase Dashboard → Edge Functions → stibee-webhook → Logs 확인"
fi

echo ""
echo "✅ 테스트 완료"
