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
  const { data, error } = await supabase
    .from('banners')
    .insert([banner])
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
  const { data, error } = await supabase
    .from('banners')
    .update(updates)
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
