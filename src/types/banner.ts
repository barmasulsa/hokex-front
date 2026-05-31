// 배너 타입 정의
export type BannerType = 'image' | 'youtube' | 'text';

export interface Banner {
  id: string;
  type: BannerType;
  title: string;
  content: string; // 이미지 URL, YouTube ID, 또는 텍스트 내용
  link_url?: string | null; // 이미지 배너 클릭 시 이동할 URL
  is_active: boolean;
  display_order: number;
  view_count?: number; // 공지사항 조회수
  show_as_popup?: boolean; // 팝업으로 표시 여부
  popup_start_date?: string | null; // 팝업 시작일 (YYYY-MM-DD)
  popup_end_date?: string | null; // 팝업 종료일 (YYYY-MM-DD)
  created_at: string;
  updated_at: string;
}
