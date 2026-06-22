-- 커뮤니티 게시판 카테고리 업데이트
-- 대괄호 []는 분류(섹션 헤더)를 의미하며, 그 아래 하위 카테고리가 버튼으로 표시됨
-- 실제 테이블 컬럼: id, name, description, icon, "order", is_active, created_at

-- 기존 데이터 삭제
DELETE FROM board_categories;

-- 새로운 카테고리 구조 삽입
-- is_active = false인 항목은 분류(섹션 헤더), true인 항목은 버튼
INSERT INTO board_categories (id, name, description, icon, "order", is_active) VALUES
  -- 베스트 게시판
  ('best', '베스트 게시판', '인기 게시글 모음', '⭐', 0, true),
  
  -- 일반 게시판 (분류 없이 바로 버튼)
  ('free', '자유게시판', '자유로운 소통 공간', '💬', 1, true),
  ('question', '질문게시판', '궁금한 점을 물어보세요', '❓', 2, true),
  ('news', '뉴스게시판', '업계 뉴스 및 소식', '📰', 3, true),
  ('info', '정보(소식)게시판', '유익한 정보 공유', 'ℹ️', 4, true),
  ('contest', '공모전 게시판', '공모전 정보', '🏆', 5, true),
  ('creative', '창작문화 게시판', '창작 활동 공유', '🎨', 6, true),
  ('survey', '논문/설문 게시판', '학술 논문 및 설문조사', '📋', 7, true),
  
  -- 유관기관 게시판 - 분류 (is_active = false)
  ('related-org-section', '유관기관 게시판', '유관기관 공지사항', '🏢', 8, false),
  ('mice-association', 'MICE협회', 'MICE 협회 공지사항', '🎪', 9, true),
  ('mice-in', '마이스인', 'MICE 업계 인사이트', '📊', 10, true),
  ('tpaf', '전통공연예술진흥재단', '전통 공연 예술 관련', '🎭', 11, true),
  
  -- 구인구직(Job)게시판 - 분류 (is_active = false)
  ('job-section', '구인구직(Job)게시판', '채용 및 구직 정보', '💼', 12, false),
  ('job-fulltime', '채용/인턴', '정규직 및 인턴 채용', '👔', 13, true),
  ('job-parttime', '스태프/단기 알바', '행사 스태프 및 단기 알바', '👥', 14, true),
  ('job-volunteer', '자원봉사', '자원봉사자 모집', '🤝', 15, true),
  
  -- 홍보게시판 - 분류 (is_active = false)
  ('promotion-section', '홍보게시판', '행사 및 제품 홍보', '📢', 16, false),
  ('promotion-exhibition', '전시', '전시회 홍보', '🖼️', 17, true),
  ('promotion-forum', '포럼', '포럼 및 컨퍼런스', '🎤', 18, true),
  ('promotion-education', '강의&교육', '교육 프로그램', '📚', 19, true),
  ('promotion-performance', '공연', '공연 및 공연예술', '🎭', 20, true),
  ('promotion-event', '행사/이벤트/팝업', '각종 행사 및 이벤트', '🎉', 21, true),
  ('promotion-venue', '베뉴', '베뉴 및 장소 홍보', '🏛️', 22, true),
  
  -- 업체홍보게시판 - 분류 (is_active = false)
  ('vendor-section', '업체홍보게시판', '업체 및 서비스 홍보', '🏪', 23, false),
  ('vendor-design', '디자인&인쇄&제본', '디자인 및 인쇄 서비스', '🖨️', 24, true),
  ('vendor-booth', '부스업체', '부스 제작 및 시공', '🏗️', 25, true),
  ('vendor-etc', '기타', '기타 업체 홍보', '📦', 26, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  "order" = EXCLUDED."order",
  is_active = EXCLUDED.is_active;

-- 완료 확인
SELECT 
  id, 
  name, 
  "order" as display_order,
  is_active,
  CASE 
    WHEN is_active = false THEN '📌 분류 (섹션 헤더)'
    ELSE '🔘 카테고리 (버튼)'
  END as type
FROM board_categories 
ORDER BY "order";
