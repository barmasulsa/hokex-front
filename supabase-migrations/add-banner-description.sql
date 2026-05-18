-- 배너 테이블에 description 필드 추가
ALTER TABLE public.banners 
ADD COLUMN IF NOT EXISTS description TEXT;

-- 기존 데이터에 대한 기본값 설정 (선택사항)
UPDATE public.banners 
SET description = '' 
WHERE description IS NULL;
