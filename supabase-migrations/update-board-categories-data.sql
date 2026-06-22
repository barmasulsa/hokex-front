-- 기존 데이터 삭제
DELETE FROM board_categories;

-- 새로운 게시판 목록 추가
-- 일반 게시판
INSERT INTO board_categories (id, name, description, icon, "order", is_section, parent_category) VALUES
('free', '자유게시판', '자유로운 소통 공간', '💬', 1, false, null),
('question', '질문게시판', '궁금한 것을 질문하세요', '❓', 2, false, null),
('news', '뉴스게시판', '최신 뉴스와 정보', '📰', 3, false, null),
('info', '정보(소식)게시판', '유용한 정보와 소식', '📝', 4, false, null),
('contest', '공모전 게시판', '공모전 정보 공유', '🏆', 5, false, null),
('creative', '창작문화 게시판', '창작물 공유 및 문화 이야기', '🎨', 6, false, null),
('research', '논문/설문 게시판', '학술 연구 및 설문 요청', '📊', 7, false, null),
('foundation', '전통공연예술진흥재단', '전통공연예술 관련', '🎭', 8, false, null),
('mice-assoc', 'MICE협회', 'MICE협회 관련 정보', '🏢', 9, false, null),
('micein', '마이스인', '마이스인 정보', '📱', 10, false, null);

-- [구인구직(Job)게시판] 분류
INSERT INTO board_categories (id, name, description, icon, "order", is_section, parent_category) VALUES
('job-section', '구인구직(Job)게시판', '채용 관련 게시판', '💼', 11, true, null),
('job-recruit', '채용/인턴', '정규직 및 인턴 채용', '👔', 12, false, 'job-section'),
('job-temp', '스태프/단기 알바', '행사 스태프 및 단기 아르바이트', '👥', 13, false, 'job-section'),
('job-volunteer', '자원봉사', '자원봉사 모집', '🤝', 14, false, 'job-section');

-- [홍보게시판] 분류
INSERT INTO board_categories (id, name, description, icon, "order", is_section, parent_category) VALUES
('promo-section', '홍보게시판', '행사 및 이벤트 홍보', '📢', 15, true, null),
('promo-exhibition', '전시', '전시회 정보', '🖼️', 16, false, 'promo-section'),
('promo-forum', '포럼', '포럼 및 세미나', '🎤', 17, false, 'promo-section'),
('promo-education', '강의&교육', '교육 프로그램 안내', '📚', 18, false, 'promo-section'),
('promo-performance', '공연', '공연 정보', '🎪', 19, false, 'promo-section'),
('promo-event', '행사/이벤트/팝업', '각종 행사 및 이벤트', '🎉', 20, false, 'promo-section'),
('promo-venue', '베뉴', '장소 및 공간 홍보', '🏛️', 21, false, 'promo-section');

-- [업체홍보게시판] 분류
INSERT INTO board_categories (id, name, description, icon, "order", is_section, parent_category) VALUES
('vendor-section', '업체홍보게시판', '업체 및 서비스 홍보', '🏪', 22, true, null),
('vendor-design', '디자인&인쇄&제본', '디자인 및 인쇄 서비스', '🎨', 23, false, 'vendor-section'),
('vendor-booth', '부스업체', '부스 제작 및 설치', '🏗️', 24, false, 'vendor-section'),
('vendor-etc', '기타', '기타 업체 서비스', '📦', 25, false, 'vendor-section');
