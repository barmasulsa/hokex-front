import { supabase } from '../lib/supabase';
import type { EventRecord } from '../types/core';

// Supabase 데이터를 EventRecord 타입으로 변환
function mapSupabaseEventToEventRecord(event: any): EventRecord {
  return {
    id: event.id,
    title: event.title,
    poster: event.poster_url || '', // NULL이면 빈 문자열 (EventCard에서 venue별 범용 포스터 처리)
    region: event.region as any,
    venue: event.venue as any,
    startDate: new Date(event.start_date),
    endDate: new Date(event.end_date),
    dayString: event.day_string,
    category: event.category as any,
    industry: event.industry,
    targetLink: event.target_link || '',
    venueEventPageUrl: event.venue_event_page_url,  // 전시장 행사 페이지 URL
    description: event.description,
    admissionFee: event.admission_fee,
    exhibitItems: event.exhibit_items,
    exhibitProducts: event.exhibit_products,
    organizer: event.organizer,
    supervisor: event.supervisor,
    contact: event.contact,
    operatingHours: event.operating_hours,
    venueHall: event.venue_hall,
    isSaved: false, // 나중에 saved_events 조인으로 설정
  };
}

// 모든 행사 가져오기
export async function fetchEvents() {
  console.log('[fetchEvents] Starting fetch with pagination');
  
  let allData: any[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  // 페이지네이션으로 모든 데이터 가져오기
  while (hasMore) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Error fetching events:', error);
      break;
    }

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      console.log(`[fetchEvents] Fetched ${data.length} events (total: ${allData.length})`);
      
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        from += pageSize;
      }
    } else {
      hasMore = false;
    }
  }

  console.log('[fetchEvents] Total events:', allData.length);

  // 엑스코 행사 확인
  const excoEvents = allData.filter(e => e.venue === '엑스코') || [];
  console.log('[fetchEvents] EXCO events:', excoEvents.length);

  // 6월 이후 엑스코 행사 확인
  const excoAfterMay = excoEvents.filter(e => e.start_date >= '2026-06-01');
  console.log('[fetchEvents] EXCO after May:', excoAfterMay.length);
  if (excoAfterMay.length > 0) {
    console.log('[fetchEvents] Sample:', excoAfterMay.slice(0, 3).map(e => e.title));
  }

  return allData.map(mapSupabaseEventToEventRecord);
}


// 특정 행사 가져오기
export async function fetchEventById(id: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching event:', error);
    return null;
  }

  return mapSupabaseEventToEventRecord(data);
}

// 사용자의 저장된 행사 가져오기
export async function fetchSavedEvents(userId: string) {
  const { data, error } = await supabase
    .from('saved_events')
    .select(`
      event_id,
      events (*)
    `)
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching saved events:', error);
    return [];
  }

  return data.map((item: any) => mapSupabaseEventToEventRecord(item.events));
}

// 행사 저장/찜하기
export async function saveEvent(userId: string, eventId: string) {
  const { error } = await supabase
    .from('saved_events')
    .insert({ user_id: userId, event_id: eventId });

  if (error) {
    console.error('Error saving event:', error);
    return false;
  }

  return true;
}

// 행사 저장 취소
export async function unsaveEvent(userId: string, eventId: string) {
  const { error } = await supabase
    .from('saved_events')
    .delete()
    .eq('user_id', userId)
    .eq('event_id', eventId);

  if (error) {
    console.error('Error unsaving event:', error);
    return false;
  }

  return true;
}

// 행사 정보 업데이트 (관리자용)
export async function updateEvent(eventId: string, updates: Partial<EventRecord>) {
  const supabaseUpdates: any = {};
  
  if (updates.title) supabaseUpdates.title = updates.title;
  if (updates.poster) supabaseUpdates.poster_url = updates.poster;
  if (updates.region) supabaseUpdates.region = updates.region;
  if (updates.venue) supabaseUpdates.venue = updates.venue;
  if (updates.startDate) supabaseUpdates.start_date = updates.startDate.toISOString().split('T')[0];
  if (updates.endDate) supabaseUpdates.end_date = updates.endDate.toISOString().split('T')[0];
  if (updates.dayString) supabaseUpdates.day_string = updates.dayString;
  if (updates.category) supabaseUpdates.category = updates.category;
  if (updates.industry) supabaseUpdates.industry = updates.industry;
  if (updates.targetLink !== undefined) supabaseUpdates.target_link = updates.targetLink;

  const { error } = await supabase
    .from('events')
    .update(supabaseUpdates)
    .eq('id', eventId);

  if (error) {
    console.error('Error updating event:', error);
    return false;
  }

  return true;
}

// 행사 생성 (관리자용)
export async function createEvent(event: Omit<EventRecord, 'id' | 'isSaved'>) {
  const { data, error } = await supabase
    .from('events')
    .insert({
      title: event.title,
      poster_url: event.poster,
      region: event.region,
      venue: event.venue,
      start_date: event.startDate.toISOString().split('T')[0],
      end_date: event.endDate.toISOString().split('T')[0],
      day_string: event.dayString,
      category: event.category,
      industry: event.industry,
      target_link: event.targetLink,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating event:', error);
    return null;
  }

  return mapSupabaseEventToEventRecord(data);
}
