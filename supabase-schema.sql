-- HOKEX Supabase Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Events Table (행사 정보)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  poster_url TEXT NOT NULL,
  region TEXT NOT NULL,
  venue TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  day_string TEXT NOT NULL,
  category TEXT NOT NULL,
  industry TEXT NOT NULL,
  target_link TEXT,
  description TEXT,
  organizer TEXT,
  admission_fee TEXT,
  operating_hours TEXT,
  contact TEXT,
  parking_info TEXT,
  transportation_info TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved Events Table (사용자가 찜한 행사)
CREATE TABLE saved_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

-- User Profiles Table (사용자 프로필)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  title TEXT,
  location TEXT,
  interests TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_region ON events(region);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_industry ON events(industry);
CREATE INDEX idx_saved_events_user_id ON saved_events(user_id);
CREATE INDEX idx_saved_events_event_id ON saved_events(event_id);

-- Unique constraint to prevent duplicate events (same title and dates)
CREATE UNIQUE INDEX idx_events_unique_title_dates ON events(title, start_date, end_date);

-- Row Level Security (RLS) Policies

-- Events: 모든 사용자가 읽을 수 있음, 관리자만 수정 가능
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by everyone"
  ON events FOR SELECT
  USING (true);

CREATE POLICY "Events are insertable by authenticated users"
  ON events FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Events are updatable by authenticated users"
  ON events FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Saved Events: 사용자는 자신의 찜 목록만 관리 가능
ALTER TABLE saved_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved events"
  ON saved_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved events"
  ON saved_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved events"
  ON saved_events FOR DELETE
  USING (auth.uid() = user_id);

-- User Profiles: 사용자는 자신의 프로필만 관리 가능
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert sample data
INSERT INTO events (title, poster_url, region, venue, start_date, end_date, day_string, category, industry, target_link, description, organizer, admission_fee, operating_hours, contact) VALUES
('서울 모터쇼 2026', 'https://via.placeholder.com/400x300/4A90E2/ffffff?text=Seoul+Motor+Show', '서울', '코엑스', '2026-04-15', '2026-04-25', '(수)', '전시', '운송장비/서비스', 'https://www.coex.co.kr', '국내 최대 규모의 자동차 전시회로, 최신 모델과 미래 모빌리티 기술을 한자리에서 만나볼 수 있습니다.', '한국자동차산업협회', '무료 (사전 등록 필요)', '09:00 - 18:00', '02-6000-0114'),
('K-뷰티 엑스포', 'https://via.placeholder.com/400x300/E24A90/ffffff?text=K-Beauty+Expo', '서울', '세텍', '2026-05-10', '2026-05-12', '(일)', '전시', '뷰티/화장품', 'https://www.setec.or.kr', '한국 화장품의 우수성을 세계에 알리는 뷰티 산업 전시회입니다.', '대한화장품협회', '₩20,000', '10:00 - 17:00', '02-3401-8114'),
('부산 국제 영화제', 'https://via.placeholder.com/400x300/90E24A/ffffff?text=Busan+Film+Festival', '경상도', '벡스코', '2026-10-05', '2026-10-14', '(월)', '공연', '문화/예술', 'https://www.bexco.co.kr', '아시아 최대 규모의 국제 영화제로 세계 각국의 영화를 상영합니다.', '부산국제영화제 조직위원회', '₩15,000', '09:00 - 22:00', '051-747-3010'),
('대구 섬유 패션 위크', 'https://via.placeholder.com/400x300/E2904A/ffffff?text=Daegu+Fashion+Week', '경상도', '엑스코', '2026-03-20', '2026-03-23', '(금)', '전시', '섬유/의류/쥬얼리', 'https://www.exco.co.kr', '대구 섬유 산업의 경쟁력을 보여주는 패션 전시회입니다.', '대구섬유산업연합회', '무료', '10:00 - 18:00', '053-601-5000'),
('킨텍스 푸드 페어', 'https://via.placeholder.com/400x300/4AE290/ffffff?text=Kintex+Food+Fair', '수도권', '킨텍스', '2026-06-01', '2026-06-05', '(월)', '전시', '농수축산/식음료', 'https://www.kintex.com', '식품 산업의 최신 트렌드와 제품을 만나볼 수 있는 종합 식품 전시회입니다.', '한국식품산업협회', '무료 (사전 등록 필요)', '09:00 - 17:00', '031-995-8114'),
('제주 관광 컨퍼런스', 'https://via.placeholder.com/400x300/904AE2/ffffff?text=Jeju+Tourism+Conference', '제주도', '제주국제컨벤션센터', '2026-07-15', '2026-07-17', '(수)', '회의', '레저/관광/스포츠', 'https://www.iccjeju.co.kr', '관광 산업의 미래를 논의하는 국제 컨퍼런스입니다.', '제주관광공사', '₩50,000', '09:00 - 18:00', '064-735-1000');
