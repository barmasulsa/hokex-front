import type { EventRecord } from './types';

// Helper to get dates relative to today
const today = new Date();
const addDays = (d: Date, days: number) => {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
};

export const DUMMY_EVENTS: EventRecord[] = [
  {
    id: '1',
    title: '글로벌 AI 컨퍼런스 2026',
    poster: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=400&q=80',
    region: '서울',
    venue: '코엑스',
    startDate: addDays(today, 2),
    endDate: addDays(today, 5),
    category: '회의',
    industry: '정보통신업',
    targetLink: 'https://example.com'
  },
  {
    id: '2',
    title: '미래 모빌리티 엑스포',
    poster: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=400&q=80',
    region: '수도권',
    venue: '킨텍스',
    startDate: addDays(today, -1),
    endDate: addDays(today, 3),
    category: '전시',
    industry: '제조업',
    targetLink: 'https://example.com'
  },
  {
    id: '3',
    title: '스마트팜 혁신 기술전',
    poster: 'https://images.unsplash.com/photo-1628183201402-ddc9f91a92e1?auto=format&fit=crop&w=400&q=80',
    region: '충청',
    venue: '세종컨벤션센터',
    startDate: addDays(today, 10),
    endDate: addDays(today, 12),
    category: '전시',
    industry: '농업, 임업 및 어업',
    targetLink: 'https://example.com'
  },
  {
    id: '4',
    title: '인디 락 아티스트 페스티벌',
    poster: 'https://images.unsplash.com/photo-1540039155732-d674d0e8c04c?auto=format&fit=crop&w=400&q=80',
    region: '동남',
    venue: '벡스코',
    startDate: addDays(today, 20),
    endDate: addDays(today, 21),
    category: '행사/공연',
    industry: '예술, 스포츠 및 여가관련 서비스업',
    targetLink: 'https://example.com'
  },
  {
    id: '5',
    title: '뷰티/코스메틱 팝업 페스타',
    poster: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80',
    region: '서울',
    venue: '코엑스 마곡',
    startDate: addDays(today, 30),
    endDate: addDays(today, 35),
    category: '행사/공연',
    industry: '도매 및 소매업',
    targetLink: 'https://example.com'
  }
];
