-- Fix COEX events: move exhibit_items to exhibit_products if exhibit_products is empty
-- 주관에 들어간 전시품목 설명을 전시품목으로 이동
UPDATE events
SET 
  exhibit_products = COALESCE(exhibit_products, exhibit_items),
  exhibit_items = CASE 
    WHEN exhibit_products IS NULL THEN NULL  -- 전시품목이 없었으면 주관도 null로
    ELSE exhibit_items  -- 전시품목이 있었으면 주관 유지
  END
WHERE venue = '코엑스' 
  AND exhibit_items IS NOT NULL;
