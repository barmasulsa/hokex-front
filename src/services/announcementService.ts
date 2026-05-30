import { supabase } from '../lib/supabase';
import type { Announcement, AnnouncementInput } from '../types/announcement';

/**
 * 활성화된 알림 가져오기 (현재 표시 기간 내)
 */
export async function fetchActiveAnnouncements(): Promise<Announcement[]> {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', now)
      .gte('end_date', now)
      .order('created_at', { ascending: false })
      .limit(1); // 가장 최근 알림 1개만

    if (error) {
      console.error('Error fetching active announcements:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchActiveAnnouncements:', error);
    return [];
  }
}

/**
 * 모든 알림 가져오기 (관리자용)
 */
export async function fetchAllAnnouncements(): Promise<Announcement[]> {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all announcements:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchAllAnnouncements:', error);
    return [];
  }
}

/**
 * 알림 생성
 */
export async function createAnnouncement(input: AnnouncementInput): Promise<Announcement | null> {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .insert([{
        title: input.title,
        content: input.content,
        type: input.type,
        start_date: input.start_date,
        end_date: input.end_date,
        is_active: input.is_active
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating announcement:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createAnnouncement:', error);
    return null;
  }
}

/**
 * 알림 수정
 */
export async function updateAnnouncement(
  id: string, 
  input: Partial<AnnouncementInput>
): Promise<Announcement | null> {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating announcement:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in updateAnnouncement:', error);
    return null;
  }
}

/**
 * 알림 삭제
 */
export async function deleteAnnouncement(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting announcement:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteAnnouncement:', error);
    return false;
  }
}
