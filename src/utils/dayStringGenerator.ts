// 요일 문자열 생성기

export class DayStringGenerator {
  /**
   * Date 객체로부터 한국어 요일 문자열 생성
   * @param date - 날짜 객체
   * @returns 괄호로 묶인 한국어 요일 (예: "(월)", "(화)")
   */
  static generate(date: Date): string {
    const days = ["(일)", "(월)", "(화)", "(수)", "(목)", "(금)", "(토)"];
    return days[date.getDay()];
  }
}

/**
 * 편의 함수: Date로부터 요일 문자열 생성
 */
export function generateDayString(date: Date): string {
  return DayStringGenerator.generate(date);
}
