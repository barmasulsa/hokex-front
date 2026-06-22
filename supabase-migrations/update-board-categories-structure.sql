-- board_categories 테이블에 is_section, parent_category 컬럼 추가

ALTER TABLE board_categories 
ADD COLUMN IF NOT EXISTS is_section BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_category TEXT REFERENCES board_categories(id) ON DELETE CASCADE;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_board_categories_parent ON board_categories(parent_category);
CREATE INDEX IF NOT EXISTS idx_board_categories_order ON board_categories("order");
