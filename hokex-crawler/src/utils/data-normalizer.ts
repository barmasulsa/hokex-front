/**
 * 데이터 정규화 유틸리티
 * 크롤링한 데이터를 정리하고 표준화
 */

/**
 * "메쎄이" 오타를 "메쎄이상"으로 수정
 * 규칙: "메쎄이"로 끝나는 경우만 수정 (뒤에 다른 글자가 없는 경우)
 * 
 * @param text 원본 텍스트
 * @returns 수정된 텍스트
 * 
 * @example
 * fixMesseiTypo("코엑스, 메쎄이") // "코엑스, 메쎄이상"
 * fixMesseiTypo("메쎄이상") // "메쎄이상" (변경 없음)
 * fixMesseiTypo("㈜메쎄이") // "㈜메쎄이상"
 */
export function fixMesseiTypo(text: string | null | undefined): string | null {
  if (!text) return null;
  
  // "메쎄이"로 끝나는 경우 (뒤에 한글이 없는 경우만)
  // "메쎄이상"은 그대로 유지
  const pattern = /메쎄이(?![상가-힣])/g;
  
  return text.replace(pattern, '메쎄이상');
}

/**
 * 주최/주관 데이터 정규화
 * - "메쎄이" 오타 수정
 * - 앞뒤 공백 제거
 * 
 * @param organizer 주최/주관 원본 텍스트
 * @returns 정규화된 텍스트
 */
export function normalizeOrganizer(organizer: string | null | undefined): string | null {
  if (!organizer) return null;
  
  let normalized = organizer.trim();
  normalized = fixMesseiTypo(normalized);
  
  return normalized || null;
}

/**
 * 전시홀 이름 정규화
 * - 앞뒤 공백 제거
 * - 여러 홀인 경우 쉼표로 구분
 * 
 * @param venueHall 전시홀 원본 텍스트
 * @returns 정규화된 텍스트
 */
export function normalizeVenueHall(venueHall: string | null | undefined): string | null {
  if (!venueHall) return null;
  
  return venueHall.trim() || null;
}

/**
 * 연락처 정보 정규화
 * - 앞뒤 공백 제거
 * 
 * @param contact 연락처 원본 텍스트
 * @returns 정규화된 텍스트
 */
export function normalizeContact(contact: string | null | undefined): string | null {
  if (!contact) return null;
  
  return contact.trim() || null;
}
