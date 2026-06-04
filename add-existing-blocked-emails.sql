-- ============================================
-- 기존에 에러난 이메일 명단을 pending_approvals에 추가
-- ============================================

-- 기존에 스팸 차단되었던 이메일 주소들을 추가
-- 실제 에러난 이메일 주소로 교체해서 사용하세요

INSERT INTO public.pending_approvals (email, reason, error_message, request_count, first_requested_at, last_requested_at)
VALUES 
  -- 실제 차단된 이메일 주소
  ('bje1@kintex.com', 'EMAIL_BLOCKED', '553 Blocked Using Spam Pattern', 1, NOW(), NOW()),
  ('frankyang@kintex.com', 'EMAIL_BLOCKED', '553 Blocked Using Spam Pattern', 1, NOW(), NOW()),
  ('jwshim@scc.or.kr', 'EMAIL_BLOCKED', '553 Blocked Using Spam Pattern', 1, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;  -- 이미 존재하면 무시

-- ============================================
-- 실제 사용 방법:
-- 1. 위의 이메일 주소들을 실제 차단된 이메일로 교체
-- 2. Supabase SQL Editor에서 실행
-- 3. 관리자 페이지(/admin/approvals)에서 확인
-- ============================================

-- 추가된 이메일 확인
SELECT * FROM public.pending_approvals ORDER BY created_at DESC;
