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
    targetLink: event.website_url || event.target_link || '',  // website_url 우선, 없으면 target_link
    venueEventPageUrl: event.venue_event_page_url,  // 전시장 행사 페이지 URL
    websiteUrl: event.website_url,  // 공식 웹사이트 URL
    description: event.description,
    admissionFee: event.admission_fee,
    exhibitItems: event.exhibit_items,
    exhibitProducts: event.exhibit_products,
    organizer: event.organizer,
    supervisor: event.supervisor,
    manager: event.manager,
    contact: event.contact,
    operatingHours: event.operating_hours,
    venueHall: event.venue_hall,
    isSaved: false, // 나중에 saved_events 조인으로 설정
  };
}

// 모든 행사 가져오기
export async function fetchEvents() {
  console.log('[fetchEvents] Starting fetch with pagination');
  
  try {
    let allData: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;
    let attempts = 0;
    const maxAttempts = 10; // 최대 10페이지 (10,000개 행사)

    // 페이지네이션으로 모든 데이터 가져오기
    while (hasMore && attempts < maxAttempts) {
      attempts++;
      console.log(`[fetchEvents] Attempt ${attempts}: fetching from ${from} to ${from + pageSize - 1}`);
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .is('deleted_at', null) // 삭제되지 않은 행사만
        .order('start_date', { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error('[fetchEvents] Error:', error);
        throw error; // 에러를 던져서 catch 블록에서 처리
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

    console.log('[fetchEvents] Completed. Total events:', allData.length);

    // 엑스코 행사 확인
    const excoEvents = allData.filter(e => e.venue === '엑스코') || [];
    console.log('[fetchEvents] EXCO events:', excoEvents.length);

    // 6월 이후 엑스코 행사 확인
    const excoAfterMay = excoEvents.filter(e => e.start_date >= '2026-06-01');
    console.log('[fetchEvents] EXCO after May:', excoAfterMay.length);
    if (excoAfterMay.length > 0) {
      console.log('[fetchEvents] Sample:', excoAfterMay.slice(0, 3).map(e => e.title));
    }

    // HICO 행사 확인
    const hicoEvents = allData.filter(e => e.venue === '경주화백컨벤션센터') || [];
    console.log('[fetchEvents] HICO events:', hicoEvents.length);
    if (hicoEvents.length > 0) {
      console.log('[fetchEvents] HICO sample:', hicoEvents.slice(0, 3).map(e => ({
        title: e.title,
        date: e.start_date,
        poster: e.poster_url
      })));
    }

    return allData.map(mapSupabaseEventToEventRecord);
  } catch (error) {
    console.error('[fetchEvents] Fatal error:', error);
    throw error; // 에러를 다시 던져서 호출자가 처리하도록
  }
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
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching saved events:', error);
    return [];
  }

  return data.map((item: any) => mapSupabaseEventToEventRecord(item.events));
}

// 사용자의 저장된 행사 ID 목록 가져오기 (빠른 조회용)
export async function fetchSavedEventIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('saved_events')
    .select('event_id')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching saved event IDs:', error);
    return [];
  }

  return data.map((item: any) => item.event_id);
}

// 행사 저장/찜하기 토글
export async function toggleSaveEvent(userId: string, eventId: string): Promise<boolean> {
  // 먼저 이미 저장되어 있는지 확인
  const { data: existing } = await supabase
    .from('saved_events')
    .select('id')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .single();

  if (existing) {
    // 이미 저장되어 있으면 삭제 (찜 취소)
    const { error } = await supabase
      .from('saved_events')
      .delete()
      .eq('user_id', userId)
      .eq('event_id', eventId);

    if (error) {
      console.error('Error unsaving event:', error);
      return false;
    }
    return false; // 찜 취소됨
  } else {
    // 저장되어 있지 않으면 추가 (찜하기)
    const { error } = await supabase
      .from('saved_events')
      .insert({ user_id: userId, event_id: eventId });

    if (error) {
      console.error('Error saving event:', error);
      return false;
    }
    return true; // 찜함
  }
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
  // 먼저 현재 값을 가져와서 이력 저장
  const { data: currentEvent, error: fetchError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (fetchError) {
    console.error('Error fetching current event:', fetchError);
    return false;
  }

  const supabaseUpdates: any = {};
  
  if (updates.title) supabaseUpdates.title = updates.title;
  if (updates.poster !== undefined) supabaseUpdates.poster_url = updates.poster;
  if (updates.region) supabaseUpdates.region = updates.region;
  if (updates.venue) supabaseUpdates.venue = updates.venue;
  if (updates.startDate) supabaseUpdates.start_date = updates.startDate.toISOString().split('T')[0];
  if (updates.endDate) supabaseUpdates.end_date = updates.endDate.toISOString().split('T')[0];
  if (updates.dayString) supabaseUpdates.day_string = updates.dayString;
  if (updates.category) supabaseUpdates.category = updates.category;
  if (updates.industry) supabaseUpdates.industry = updates.industry;
  if (updates.targetLink !== undefined) supabaseUpdates.target_link = updates.targetLink;
  if (updates.venueEventPageUrl !== undefined) supabaseUpdates.venue_event_page_url = updates.venueEventPageUrl;
  if (updates.websiteUrl !== undefined) supabaseUpdates.website_url = updates.websiteUrl;
  if (updates.description !== undefined) supabaseUpdates.description = updates.description;
  if (updates.organizer !== undefined) supabaseUpdates.organizer = updates.organizer;
  if (updates.supervisor !== undefined) supabaseUpdates.supervisor = updates.supervisor;
  if (updates.admissionFee !== undefined) supabaseUpdates.admission_fee = updates.admissionFee;
  if (updates.exhibitItems !== undefined) supabaseUpdates.exhibit_items = updates.exhibitItems;
  if (updates.operatingHours !== undefined) supabaseUpdates.operating_hours = updates.operatingHours;
  if (updates.venueHall !== undefined) supabaseUpdates.venue_hall = updates.venueHall;

  const { error } = await supabase
    .from('events')
    .update(supabaseUpdates)
    .eq('id', eventId);

  if (error) {
    console.error('Error updating event:', error);
    return false;
  }

  // 변경 이력 저장
  if (updates.title && currentEvent.title !== updates.title) {
    await saveEventHistory(eventId, 'title', currentEvent.title, updates.title);
  }
  if (updates.poster !== undefined && currentEvent.poster_url !== updates.poster) {
    await saveEventHistory(eventId, 'poster', currentEvent.poster_url, updates.poster);
  }
  if (updates.startDate && currentEvent.start_date !== updates.startDate.toISOString().split('T')[0]) {
    await saveEventHistory(eventId, 'startDate', currentEvent.start_date, updates.startDate.toISOString().split('T')[0]);
  }
  if (updates.endDate && currentEvent.end_date !== updates.endDate.toISOString().split('T')[0]) {
    await saveEventHistory(eventId, 'endDate', currentEvent.end_date, updates.endDate.toISOString().split('T')[0]);
  }
  if (updates.venueEventPageUrl !== undefined && currentEvent.venue_event_page_url !== updates.venueEventPageUrl) {
    await saveEventHistory(eventId, 'venueEventPageUrl', currentEvent.venue_event_page_url, updates.venueEventPageUrl);
  }
  if (updates.websiteUrl !== undefined && currentEvent.website_url !== updates.websiteUrl) {
    await saveEventHistory(eventId, 'websiteUrl', currentEvent.website_url, updates.websiteUrl);
  }
  if (updates.description !== undefined && currentEvent.description !== updates.description) {
    await saveEventHistory(eventId, 'description', currentEvent.description, updates.description);
  }
  if (updates.organizer !== undefined && currentEvent.organizer !== updates.organizer) {
    await saveEventHistory(eventId, 'organizer', currentEvent.organizer, updates.organizer);
  }
  if (updates.supervisor !== undefined && currentEvent.supervisor !== updates.supervisor) {
    await saveEventHistory(eventId, 'supervisor', currentEvent.supervisor, updates.supervisor);
  }
  if (updates.admissionFee !== undefined && currentEvent.admission_fee !== updates.admissionFee) {
    await saveEventHistory(eventId, 'admissionFee', currentEvent.admission_fee, updates.admissionFee);
  }
  if (updates.exhibitItems !== undefined && currentEvent.exhibit_items !== updates.exhibitItems) {
    await saveEventHistory(eventId, 'exhibitItems', currentEvent.exhibit_items, updates.exhibitItems);
  }
  if (updates.operatingHours !== undefined && currentEvent.operating_hours !== updates.operatingHours) {
    await saveEventHistory(eventId, 'operatingHours', currentEvent.operating_hours, updates.operatingHours);
  }
  if (updates.venueHall !== undefined && currentEvent.venue_hall !== updates.venueHall) {
    await saveEventHistory(eventId, 'venueHall', currentEvent.venue_hall, updates.venueHall);
  }
  if (updates.category !== undefined) {
    const oldCategory = Array.isArray(currentEvent.category) ? currentEvent.category[0] : currentEvent.category;
    const newCategory = Array.isArray(updates.category) ? updates.category[0] : updates.category;
    if (oldCategory !== newCategory) {
      await saveEventHistory(eventId, 'category', oldCategory, newCategory);
    }
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

// 변경 이력 저장
export async function saveEventHistory(
  eventId: string,
  fieldName: string,
  oldValue: string | null,
  newValue: string | null
) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('No user logged in');
    return false;
  }

  const { error } = await supabase
    .from('event_history')
    .insert({
      event_id: eventId,
      user_id: user.id,
      field_name: fieldName,
      old_value: oldValue,
      new_value: newValue,
    });

  if (error) {
    console.error('Error saving event history:', error);
    return false;
  }

  return true;
}

// 행사 변경 이력 가져오기
export async function fetchEventHistory(eventId: string) {
  const { data, error } = await supabase
    .from('event_history')
    .select(`
      *,
      user_profiles!event_history_user_id_fkey (
        email
      )
    `)
    .eq('event_id', eventId)
    .order('changed_at', { ascending: false });

  if (error) {
    console.error('Error fetching event history:', error);
    return [];
  }

  return data;
}

// 변경 되돌리기
export async function revertEventChange(eventId: string, historyId: string) {
  // 이력 항목 가져오기
  const { data: history, error: historyError } = await supabase
    .from('event_history')
    .select('*')
    .eq('id', historyId)
    .single();

  if (historyError || !history) {
    console.error('Error fetching history:', historyError);
    return false;
  }

  // 필드명을 DB 컬럼명으로 매핑
  const fieldMapping: Record<string, string> = {
    'title': 'title',
    'poster': 'poster_url',
    'startDate': 'start_date',
    'endDate': 'end_date',
    'venueEventPageUrl': 'venue_event_page_url',
    'websiteUrl': 'website_url',
  };

  const dbFieldName = fieldMapping[history.field_name] || history.field_name;

  // 이전 값으로 되돌리기
  const { error: updateError } = await supabase
    .from('events')
    .update({ [dbFieldName]: history.old_value })
    .eq('id', eventId);

  if (updateError) {
    console.error('Error reverting change:', updateError);
    return false;
  }

  // 되돌리기 이력 저장
  await saveEventHistory(eventId, history.field_name, history.new_value, history.old_value);

  return true;
}
