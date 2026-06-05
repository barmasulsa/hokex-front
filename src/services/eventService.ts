import { supabase } from '../lib/supabase';
import type { EventRecord } from '../types/core';

// Supabase 데이터를 EventRecord 타입으로 변환
function mapSupabaseEventToEventRecord(event: any): EventRecord {
  // exhibit_items 파싱: DB에 JSON 문자열로 저장되어 있음
  let parsedExhibitItems: string[] | undefined;
  if (event.exhibit_items) {
    try {
      // JSON 문자열이면 파싱
      if (typeof event.exhibit_items === 'string') {
        parsedExhibitItems = JSON.parse(event.exhibit_items);
      } else if (Array.isArray(event.exhibit_items)) {
        parsedExhibitItems = event.exhibit_items;
      }
    } catch {
      // 파싱 실패하면 undefined
      parsedExhibitItems = undefined;
    }
  }
  
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
    exhibit_items: parsedExhibitItems, // 파싱된 배열
    exhibitProducts: event.exhibit_products,
    organizer: event.organizer,
    supervisor: event.supervisor,
    manager: event.manager,
    contact: event.contact,
    operatingHours: event.operating_hours,
    venueHall: event.venue_hall,
    isSaved: false, // 나중에 saved_events 조인으로 설정
    view_count: event.view_count || 0, // 조회수
  };
}

// 캐시 관련 타입 및 유틸리티
interface CachedData<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time To Live (밀리초)
}

function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const { data, timestamp, ttl }: CachedData<T> = JSON.parse(cached);
    const now = Date.now();
    
    // TTL 만료 확인
    if (now - timestamp > ttl) {
      localStorage.removeItem(key);
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}

function setCachedData<T>(key: string, data: T, ttl: number = 300000) {
  // 기본 TTL: 5분 (300,000ms)
  const cached: CachedData<T> = {
    data,
    timestamp: Date.now(),
    ttl
  };
  localStorage.setItem(key, JSON.stringify(cached));
}

// 페이지네이션된 행사 가져오기 (48개씩)
export async function fetchEventsPaginated(
  pageParam: number = 0, 
  pageSize: number = 48
) {
  const from = pageParam * pageSize;
  const to = from + pageSize - 1;
  
  console.log(`[fetchEventsPaginated] Fetching page ${pageParam}, from ${from} to ${to}`);
  
  // 첫 페이지만 count 계산 (성능 최적화)
  const needCount = pageParam === 0;
  
  const query = supabase
    .from('events')
    .select('*', { count: needCount ? 'exact' : undefined })
    .is('deleted_at', null)
    .order('start_date', { ascending: true })
    .range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('[fetchEventsPaginated] Error:', error);
    throw error;
  }

  console.log(`[fetchEventsPaginated] Fetched ${data?.length || 0} events`);

  return {
    events: (data || []).map(mapSupabaseEventToEventRecord),
    nextPage: data && data.length === pageSize ? pageParam + 1 : undefined,
    totalCount: count || undefined
  };
}

// 캐싱이 적용된 페이지네이션 (첫 페이지만 캐싱)
export async function fetchEventsPaginatedWithCache(
  pageParam: number = 0, 
  pageSize: number = 48
) {
  // 첫 페이지만 캐싱
  if (pageParam === 0) {
    const cacheKey = `events:page:0:size:${pageSize}`;
    
    // 캐시 확인
    const cached = getCachedData<{ events: EventRecord[]; nextPage?: number; totalCount?: number }>(cacheKey);
    if (cached) {
      console.log('[Cache] Hit for homepage events');
      // 날짜 문자열을 Date 객체로 복원
      return {
        ...cached,
        events: cached.events.map(event => ({
          ...event,
          startDate: new Date(event.startDate),
          endDate: new Date(event.endDate)
        }))
      };
    }
    
    // 캐시 미스 → DB 조회
    console.log('[Cache] Miss, fetching from DB');
    const result = await fetchEventsPaginated(pageParam, pageSize);
    
    // 캐시 저장 (5분 TTL)
    setCachedData(cacheKey, result, 300000);
    
    return result;
  }
  
  // 2페이지 이후는 직접 DB 조회
  return fetchEventsPaginated(pageParam, pageSize);
}

// 모든 행사 가져오기 (캐싱 적용)
export async function fetchEvents() {
  const cacheKey = 'events:all';
  
  // 캐시 확인
  const cached = getCachedData<EventRecord[]>(cacheKey);
  if (cached) {
    console.log('[Cache] Hit for all events');
    // 날짜 문자열을 Date 객체로 복원
    return cached.map(event => ({
      ...event,
      startDate: new Date(event.startDate),
      endDate: new Date(event.endDate)
    }));
  }
  
  console.log('[Cache] Miss, fetching all events from DB');
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

    const result = allData.map(mapSupabaseEventToEventRecord);
    
    // 캐시 저장 (5분 TTL)
    setCachedData(cacheKey, result, 300000);
    
    return result;
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

// 조회수 증가 (즉시 DB에 기록) - 하루 1회, 관리자는 예외
export async function incrementViewCount(eventId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // 관리자 이메일 (하드코딩)
    const ADMIN_EMAIL = 'lcw55@naver.com';
    
    // 관리자 여부 확인
    const isAdmin = user?.email === ADMIN_EMAIL;
    
    // 관리자가 아닌 경우 중복 방지 체크 (하루 1회)
    if (!isAdmin) {
      const viewedKey = `event_viewed_${eventId}`;
      const lastViewedDate = localStorage.getItem(viewedKey);
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
      
      if (lastViewedDate === today) {
        console.log(`[ViewCount] Already viewed event ${eventId} today (non-admin)`);
        return;
      }
      
      // localStorage에 오늘 날짜 저장
      localStorage.setItem(viewedKey, today);
    } else {
      console.log(`[ViewCount] Admin user - bypassing duplicate check for event ${eventId}`);
    }
    
    const { error } = await supabase.rpc('increment_event_view_count', {
      p_event_id: eventId,
      p_user_id: user?.id || null
    });

    if (error) {
      console.error(`[ViewCount] Error incrementing view count for event ${eventId}:`, error);
    } else {
      console.log(`[ViewCount] Successfully incremented view count for event ${eventId}`);
    }
  } catch (err) {
    console.error(`[ViewCount] Exception incrementing view count:`, err);
  }
}

// 조회수 통계 가져오기 (관리자 전용)
export interface ViewCountStats {
  eventId: string;
  title: string;
  venue: string;
  region: string;
  viewCount: number;
  startDate: Date;
  endDate: Date;
  poster: string;
}

export interface ViewCountStatsFilters {
  limit?: number;
  region?: string;
  venue?: string;
  startDate?: string;
  endDate?: string;
}

export async function fetchViewCountStats(
  limit: number = 50,
  filters?: ViewCountStatsFilters
): Promise<ViewCountStats[]> {
  console.log('[ViewCountStats] Fetching view count stats with filters:', filters);
  console.log('[ViewCountStats] startDate:', filters?.startDate, 'endDate:', filters?.endDate);
  console.log('[ViewCountStats] Has startDate?', !!filters?.startDate, 'Has endDate?', !!filters?.endDate);
  
  // 기간 필터가 있으면 event_views_log 테이블에서 조회
  // CRITICAL: Only use period-based query if BOTH dates are provided or at least one is truthy
  if (filters?.startDate || filters?.endDate) {
    console.log('[ViewCountStats] Using period-based query from event_views_log');
    
    const { data, error } = await supabase.rpc('get_event_views_by_period', {
      p_start_date: filters.startDate || '2020-01-01',
      p_end_date: filters.endDate || '2099-12-31',
      p_limit: limit,
      p_region: (filters.region && filters.region !== '전체') ? filters.region : null,
      p_venue: (filters.venue && filters.venue !== '전체') ? filters.venue : null
    });

    if (error) {
      console.error('[ViewCountStats] Error fetching period view stats:', error);
      return [];
    }

    console.log('[ViewCountStats] Period data count:', data?.length);

    const results = (data || []).map((event: any) => ({
      eventId: event.event_id,
      title: event.title,
      venue: event.venue,
      region: event.region,
      viewCount: event.view_count || 0,
      startDate: new Date(event.start_date),
      endDate: new Date(event.end_date),
      poster: event.poster_url || ''
    }));

    console.log('[ViewCountStats] Period results count:', results.length);
    console.log('[ViewCountStats] Sample period results (first 3):', results.slice(0, 3).map((r: { title: string; viewCount: number }) => ({
      title: r.title,
      viewCount: r.viewCount
    })));

    return results;
  }

  // 기간 필터가 없으면 events 테이블의 누적 view_count 사용
  console.log('[ViewCountStats] Using cumulative view_count from events table');
  
  let query = supabase
    .from('events')
    .select('id, title, venue, region, view_count, start_date, end_date, poster_url')
    .is('deleted_at', null);

  // 지역 필터
  if (filters?.region && filters.region !== '전체') {
    query = query.eq('region', filters.region);
  }

  // 전시장 필터
  if (filters?.venue && filters.venue !== '전체') {
    query = query.eq('venue', filters.venue);
  }

  const { data, error } = await query
    .order('view_count', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error('[ViewCountStats] Error fetching cumulative view count stats:', error);
    return [];
  }

  console.log('[ViewCountStats] Cumulative data count:', data?.length);
  console.log('[ViewCountStats] Sample cumulative data (first 3):', data?.slice(0, 3).map(e => ({
    title: e.title,
    view_count: e.view_count,
    id: e.id
  })));

  const results = data.map(event => ({
    eventId: event.id,
    title: event.title,
    venue: event.venue,
    region: event.region,
    viewCount: event.view_count || 0,
    startDate: new Date(event.start_date),
    endDate: new Date(event.end_date),
    poster: event.poster_url || ''
  }));

  console.log('[ViewCountStats] Cumulative results count:', results.length);
  console.log('[ViewCountStats] Sample cumulative results (first 3):', results.slice(0, 3).map(r => ({
    title: r.title,
    viewCount: r.viewCount
  })));

  return results;
}

// 전시품목 목록은 하드코딩된 상수를 사용 (types/core.ts의 EXHIBIT_ITEMS)

// 찜 목록 통계 가져오기 (관리자 전용)
export interface SavedEventStats {
  eventId: string;
  title: string;
  venue: string;
  region: string;
  savedCount: number;
  startDate: Date;
  endDate: Date;
  poster: string;
}

export async function fetchSavedEventStats(
  limit: number = 50,
  filters?: ViewCountStatsFilters
): Promise<SavedEventStats[]> {
  // 먼저 saved_events에서 event_id별 count를 가져옴
  let savedCountQuery = supabase
    .from('saved_events')
    .select('event_id');

  const { data: savedData, error: savedError } = await savedCountQuery;

  if (savedError) {
    console.error('Error fetching saved events:', savedError);
    return [];
  }

  // event_id별로 count 계산
  const eventSavedCounts = new Map<string, number>();
  savedData?.forEach(item => {
    const count = eventSavedCounts.get(item.event_id) || 0;
    eventSavedCounts.set(item.event_id, count + 1);
  });

  // count가 있는 event_id만 추출하고 내림차순 정렬
  const sortedEventIds = Array.from(eventSavedCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([eventId]) => eventId);

  if (sortedEventIds.length === 0) {
    return [];
  }

  // 상위 event들의 정보 가져오기
  let eventsQuery = supabase
    .from('events')
    .select('id, title, venue, region, start_date, end_date, poster_url')
    .is('deleted_at', null)
    .in('id', sortedEventIds.slice(0, Math.min(limit * 2, sortedEventIds.length))); // 필터링을 고려해 여유있게 가져옴

  // 지역 필터
  if (filters?.region && filters.region !== '전체') {
    eventsQuery = eventsQuery.eq('region', filters.region);
  }

  // 전시장 필터
  if (filters?.venue && filters.venue !== '전체') {
    eventsQuery = eventsQuery.eq('venue', filters.venue);
  }

  // 날짜 필터 (행사 시작일 기준)
  if (filters?.startDate) {
    eventsQuery = eventsQuery.gte('start_date', filters.startDate);
  }
  if (filters?.endDate) {
    eventsQuery = eventsQuery.lte('start_date', filters.endDate);
  }

  const { data: eventsData, error: eventsError } = await eventsQuery;

  if (eventsError) {
    console.error('Error fetching events:', eventsError);
    return [];
  }

  // 결과 매핑 및 정렬
  const results = eventsData
    .map(event => ({
      eventId: event.id,
      title: event.title,
      venue: event.venue,
      region: event.region,
      savedCount: eventSavedCounts.get(event.id) || 0,
      startDate: new Date(event.start_date),
      endDate: new Date(event.end_date),
      poster: event.poster_url || ''
    }))
    .sort((a, b) => b.savedCount - a.savedCount)
    .slice(0, limit);

  return results;
}
