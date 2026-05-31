import { supabase } from '../lib/supabase';
import type { Banner } from '../types/banner';

/**
 * 활성화된 배너 목록 조회 (표시 순서대로)
 */
export async function fetchActiveBanners(): Promise<Banner[]> {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('배너 조회 실패:', error);
    return [];
  }

  return data || [];
}

/**
 * 모든 배너 조회 (관리자용)
 */
export async function fetchAllBanners(): Promise<Banner[]> {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    console.error('배너 조회 실패:', error);
    return [];
  }

  return data || [];
}

/**
 * 배너 생성
 */
export async function createBanner(banner: Omit<Banner, 'id' | 'created_at' | 'updated_at'>): Promise<Banner | null> {
  // link_url이 빈 문자열이거나 null/undefined이면 null로 통일
  const cleanedBanner = {
    ...banner,
    link_url: banner.link_url?.trim() || null
  };

  const { data, error } = await supabase
    .from('banners')
    .insert([cleanedBanner])
    .select()
    .single();

  if (error) {
    console.error('배너 생성 실패:', error);
    return null;
  }

  return data;
}

/**
 * 배너 수정
 */
export async function updateBanner(id: string, updates: Partial<Banner>): Promise<Banner | null> {
  // link_url이 빈 문자열이거나 null/undefined이면 null로 통일
  // popup_end_date도 명시적으로 null 처리
  const cleanedUpdates = {
    ...updates,
    link_url: updates.link_url !== undefined 
      ? (updates.link_url?.trim() || null)
      : undefined,
    popup_end_date: updates.popup_end_date !== undefined
      ? (updates.popup_end_date || null)
      : undefined
  };

  const { data, error } = await supabase
    .from('banners')
    .update(cleanedUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('배너 수정 실패:', error);
    return null;
  }

  return data;
}

/**
 * 배너 삭제
 */
export async function deleteBanner(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('banners')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('배너 삭제 실패:', error);
    return false;
  }

  return true;
}

/**
 * 배너 조회수 증가 (하루 1회 중복 방지)
 */
export async function incrementBannerViewCount(bannerId: string): Promise<boolean> {
  // 오늘 날짜 키 생성 (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0];
  const viewKey = `banner_viewed_${bannerId}_${today}`;
  
  // 오늘 이미 조회했는지 확인
  const alreadyViewed = localStorage.getItem(viewKey);
  if (alreadyViewed) {
    console.log(`배너 ${bannerId}는 오늘 이미 조회됨`);
    return false;
  }

  try {
    // 조회수 증가
    const { error } = await supabase.rpc('increment_banner_view_count', {
      banner_id: bannerId
    });

    if (error) {
      console.error('배너 조회수 증가 실패:', error);
      return false;
    }

    // 오늘 조회했다고 기록 (자정까지 유효)
    localStorage.setItem(viewKey, 'true');
    
    console.log(`배너 ${bannerId} 조회수 증가 완료`);
    return true;
  } catch (error) {
    console.error('배너 조회수 증가 중 오류:', error);
    return false;
  }
}
