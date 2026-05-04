/**
 * COEX 행사 일정 페이지에서 포스터 정보 크롤링
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

export interface CoexEventPoster {
  title: string;
  posterUrl: string;
  startDate?: string;
  endDate?: string;
  hall?: string;
}

export class CoexScheduleScraper {
  /**
   * COEX 행사 일정 페이지에서 모든 행사의 포스터 정보 추출
   */
  async scrapeAllEventPosters(): Promise<Map<string, CoexEventPoster>> {
    console.log('🔍 COEX 행사 일정 페이지 크롤링 중...\n');
    
    const posterMap = new Map<string, CoexEventPoster>();
    
    try {
      const response = await axios.get('https://www.coex.co.kr/event/full-schedules/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
      });
      
      const html = response.data;
      const $ = cheerio.load(html);
      
      // 행사 카드 찾기 - BlogEventItem 클래스 사용
      $('.BlogEventItem').each((_, card) => {
        try {
          const $card = $(card);
          
          // 포스터 이미지 찾기 - BlogEventItemHover 내부의 img
          let posterUrl = '';
          const imgElement = $card.find('.BlogEventItemHover img').first();
          
          if (imgElement.length > 0) {
            posterUrl = imgElement.attr('src') || imgElement.attr('data-src') || '';
            
            // 상대 경로를 절대 경로로 변환
            if (posterUrl && !posterUrl.startsWith('http')) {
              posterUrl = `https://www.coex.co.kr${posterUrl}`;
            }
          }
          
          // 행사명 찾기 - BlogEventItemCont-tit 클래스 (첫 번째만)
          let title = '';
          const titleElement = $card.find('.BlogEventItemCont-tit').first();
          if (titleElement.length > 0) {
            title = titleElement.text().trim();
          }
          
          // 날짜 정보 찾기 - BlogEventItemCont-date (첫 번째만)
          const dateText = $card.find('.BlogEventItemCont-date').first().text().trim();
          
          // 홀 정보 찾기 - BlogEventItemCont-hall (첫 번째만)
          const hallText = $card.find('.BlogEventItemCont-hall').first().text().trim();
          
          if (title && posterUrl) {
            // 행사명 정규화 (특수문자 제거, 공백 정리)
            const normalizedTitle = this.normalizeTitle(title);
            
            posterMap.set(normalizedTitle, {
              title: title,
              posterUrl: posterUrl,
              startDate: dateText,
              hall: hallText
            });
            
            console.log(`✅ ${title}`);
            console.log(`   포스터: ${posterUrl.substring(0, 60)}...`);
          }
        } catch (error) {
          // 개별 카드 파싱 실패는 무시
        }
      });
      
      console.log(`\n📊 총 ${posterMap.size}개 행사 포스터 정보 수집 완료\n`);
      
      return posterMap;
      
    } catch (error) {
      console.error('❌ 페이지 크롤링 실패:', error);
      return posterMap;
    }
  }
  
  /**
   * 행사명 정규화 (매칭을 위해)
   */
  private normalizeTitle(title: string): string {
    return title
      .trim()
      .replace(/\s+/g, ' ')  // 여러 공백을 하나로
      .replace(/[()]/g, '')  // 괄호 제거
      .toLowerCase();
  }
  
  /**
   * 두 행사명이 유사한지 확인
   */
  matchTitle(title1: string, title2: string): boolean {
    const normalized1 = this.normalizeTitle(title1);
    const normalized2 = this.normalizeTitle(title2);
    
    // 완전 일치
    if (normalized1 === normalized2) {
      return true;
    }
    
    // 한쪽이 다른 쪽을 포함
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
      return true;
    }
    
    // 유사도 계산 (간단한 방법)
    const words1 = normalized1.split(' ');
    const words2 = normalized2.split(' ');
    
    let matchCount = 0;
    for (const word1 of words1) {
      if (words2.some(word2 => word1.includes(word2) || word2.includes(word1))) {
        matchCount++;
      }
    }
    
    // 50% 이상 단어가 매칭되면 같은 행사로 판단
    return matchCount / Math.max(words1.length, words2.length) >= 0.5;
  }
  
  /**
   * 행사명으로 포스터 찾기
   */
  findPosterByTitle(title: string, posterMap: Map<string, CoexEventPoster>): string | null {
    const normalizedTitle = this.normalizeTitle(title);
    
    // 정확한 매칭 시도
    if (posterMap.has(normalizedTitle)) {
      return posterMap.get(normalizedTitle)!.posterUrl;
    }
    
    // 유사한 제목 찾기
    for (const [, value] of posterMap.entries()) {
      if (this.matchTitle(title, value.title)) {
        return value.posterUrl;
      }
    }
    
    return null;
  }
}
