/**
 * 엑셀 파일 자동 다운로드 서비스
 * API 직접 호출 방식 사용 (Puppeteer 대신)
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class ExcelDownloader {
  private downloadPath: string;

  constructor(downloadPath?: string) {
    this.downloadPath = downloadPath || path.join(os.homedir(), 'Downloads');
  }

  /**
   * COEX 웹사이트에서 엑셀 파일 자동 다운로드 (API 직접 호출)
   */
  async downloadCoexSchedule(
    startDate?: string,
    endDate?: string,
    keyword?: string
  ): Promise<string> {
    console.log(`\n📥 COEX 일정 다운로드 시작...\n`);

    try {
      // 날짜 기본값 설정 (현재 날짜부터 1년)
      if (!startDate) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        startDate = `${year}.${month}.${day}`;
      }
      
      if (!endDate) {
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const year = oneYearLater.getFullYear();
        const month = String(oneYearLater.getMonth() + 1).padStart(2, '0');
        const day = String(oneYearLater.getDate()).padStart(2, '0');
        endDate = `${year}.${month}.${day}`;
      }

      console.log(`📅 기간: ${startDate} ~ ${endDate}`);
      if (keyword) {
        console.log(`🔍 키워드: ${keyword}`);
      }
      console.log();

      // WordPress AJAX 엔드포인트
      const ajaxUrl = 'https://www.coex.co.kr/wp-admin/admin-ajax.php';

      // POST 데이터 준비
      const formData = new URLSearchParams({
        action: 'download_exhibitions',
        search_keyword: keyword || '',
        search_type: '',
        search_start_date: startDate,
        search_end_date: endDate,
        search_dept: ''
      });

      console.log(`🌐 API 호출 중...`);

      // API 호출
      const response = await axios.post(ajaxUrl, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.coex.co.kr/event/full-schedules/'
        },
        timeout: 30000
      });

      const responseText = response.data;
      console.log(`📨 응답: ${responseText}\n`);

      // 응답 파싱
      const parts = responseText.split('^');

      if (parts[0] === 'MAX LIMIT DOWNLOAD COUNT') {
        throw new Error('일정은 최대 1,000건까지 다운로드할 수 있습니다. 검색 옵션을 변경해주세요.');
      } else if (parts[0] === 'CREATE_FAIL') {
        throw new Error('엑셀 파일을 생성하지 못했습니다. 다시 시도해주세요.');
      } else if (parts[0] === 'NO DOWNLOAD RESULTS') {
        throw new Error('다운로드 가능한 행사가 없습니다. 다시 시도해주세요.');
      } else if (parts[0] === 'CREATE_OK') {
        const filename = parts[1];
        const fileUrl = `https://www.coex.co.kr/wp-content/uploads/data/${filename}`;

        console.log(`📥 파일 다운로드 중: ${fileUrl}\n`);

        // 파일 다운로드
        const fileResponse = await axios.get(fileUrl, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 30000
        });

        // 파일 저장
        const localFilePath = path.join(this.downloadPath, filename);
        fs.writeFileSync(localFilePath, fileResponse.data);

        console.log(`✅ 다운로드 완료: ${localFilePath}\n`);

        return localFilePath;
      } else {
        throw new Error('사용할 수 없는 기능입니다.');
      }

    } catch (error: any) {
      console.error(`\n❌ 다운로드 실패:`, error.message);
      throw error;
    }
  }

  /**
   * 다운로드된 파일 정리 (선택적)
   */
  async cleanupOldFiles(pattern: string = 'Coex_Schedule_*.xls'): Promise<void> {
    const files = fs.readdirSync(this.downloadPath);
    const matchingFiles = files.filter(f => this.matchPattern(f, pattern));

    // 가장 최근 파일 제외하고 삭제
    if (matchingFiles.length > 1) {
      const sortedFiles = matchingFiles
        .map(f => ({
          name: f,
          path: path.join(this.downloadPath, f),
          time: fs.statSync(path.join(this.downloadPath, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      // 가장 최근 파일 제외
      const filesToDelete = sortedFiles.slice(1);

      for (const file of filesToDelete) {
        fs.unlinkSync(file.path);
        console.log(`🗑️  이전 파일 삭제: ${file.name}`);
      }
    }
  }

  /**
   * 간단한 패턴 매칭
   */
  private matchPattern(filename: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filename);
  }
}
