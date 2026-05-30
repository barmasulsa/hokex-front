-- 배너 테이블에 팝업 기능 컬럼 추가
-- 실행 날짜: 2026-05-31

-- 1. 팝업 관련 컬럼 추가
ALTER TABLE banners
ADD COLUMN IF NOT EXISTS show_as_popup BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS popup_start_date DATE,
ADD COLUMN IF NOT EXISTS popup_end_date DATE;

-- 2. 팝업 기간 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_banners_popup_period 
ON banners(show_as_popup, popup_start_date, popup_end_date)
WHERE show_as_popup = TRUE AND is_active = TRUE;

-- 3. 팝업 배너 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_banners_active_popup 
ON banners(type, is_active, show_as_popup)
WHERE is_active = TRUE;

-- 4. 기존 데이터 확인 (선택사항)
-- SELECT id, title, type, show_as_popup, popup_start_date, popup_end_date 
-- FROM banners 
-- WHERE type = 'text';

COMMENT ON COLUMN banners.show_as_popup IS '팝업으로 표시할지 여부';
COMMENT ON COLUMN banners.popup_start_date IS '팝업 시작일 (이 날짜부터 팝업 표시)';
COMMENT ON COLUMN banners.popup_end_date IS '팝업 종료일 (이 날짜까지 팝업 표시)';
