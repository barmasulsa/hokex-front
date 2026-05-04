/**
 * Bug Condition Exploration Test
 * 
 * Feature: excel-download-automation-fix
 * Property 1: Bug Condition - JavaScript-Triggered Download Button Detection Fails
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * DO NOT attempt to fix the test or the code when it fails
 * 
 * This test encodes the expected behavior - it will validate the fix when it passes after implementation
 * 
 * GOAL: Surface counterexamples that demonstrate the bug exists
 * Scoped PBT Approach: Scope the property to concrete failing case - COEX schedule page with href="javascript:void(0);" button
 */

import { ExcelDownloader } from '../excel-downloader';
import * as fs from 'fs';
import * as path from 'path';

describe('Bug Condition Exploration: JavaScript-Triggered Download Button', () => {
  let downloader: ExcelDownloader;
  let testDownloadPath: string;

  beforeAll(() => {
    // Use a test-specific download directory
    testDownloadPath = path.join(__dirname, '../../__test-downloads__');
    if (!fs.existsSync(testDownloadPath)) {
      fs.mkdirSync(testDownloadPath, { recursive: true });
    }
    downloader = new ExcelDownloader(testDownloadPath);
  });

  afterAll(() => {
    // Cleanup test download directory
    if (fs.existsSync(testDownloadPath)) {
      const files = fs.readdirSync(testDownloadPath);
      files.forEach(file => {
        fs.unlinkSync(path.join(testDownloadPath, file));
      });
      fs.rmdirSync(testDownloadPath);
    }
  });

  /**
   * Property 1: Bug Condition - JavaScript-Triggered Downloads Work
   * 
   * For any download button where the href is javascript:void(0); or similar JavaScript pseudo-protocol,
   * and the button has text content matching "다운로드" or "일정 다운로드",
   * the fixed downloadCoexSchedule function SHALL successfully locate the button,
   * trigger its click event, detect the downloaded file, and return the absolute file path
   * within the 30-second timeout.
   * 
   * EXPECTED OUTCOME ON UNFIXED CODE: Test FAILS with timeout or null element error
   * This is CORRECT - it proves the bug exists
   * 
   * Document counterexamples found:
   * - Which selectors return null
   * - What the actual button attributes are
   * - Whether ElementHandle type error occurs
   */
  test('should successfully download Excel file from COEX schedule page with javascript:void(0); button', async () => {
    // This test will take time as it navigates to real COEX website
    // Increase timeout to 60 seconds to account for network latency
    jest.setTimeout(60000);

    console.log('\n🔍 Starting bug condition exploration test...');
    console.log('📍 Target: COEX schedule page with javascript:void(0); button');
    console.log('⏱️  Timeout: 60 seconds\n');

    let result: string | null = null;
    let error: Error | null = null;

    try {
      // Attempt to download from COEX schedule page
      result = await downloader.downloadCoexSchedule();
      
      console.log('✅ Download completed successfully');
      console.log(`📁 File path: ${result}`);
    } catch (err) {
      error = err as Error;
      console.error('❌ Download failed with error:');
      console.error(`   Type: ${error.name}`);
      console.error(`   Message: ${error.message}`);
      
      // Document the counterexample
      console.log('\n📋 Counterexample Documentation:');
      console.log('   This failure demonstrates the bug condition:');
      console.log('   - The download button likely uses href="javascript:void(0);"');
      console.log('   - Current selectors ([href*=".xls"], [href*=".xlsx"]) cannot match it');
      console.log('   - Possible ElementHandle type error (treating return value as array)');
      console.log('   - Button exists but is not being detected by current selector strategies\n');
    }

    // Assertions matching Expected Behavior from requirements
    // These will FAIL on unfixed code, which is the expected outcome
    
    // Assertion 1: Result should be a valid file path (string)
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    
    // Assertion 2: File should exist at the returned path
    expect(fs.existsSync(result!)).toBe(true);
    
    // Assertion 3: File extension should be .xls or .xlsx
    const extension = path.extname(result!).toLowerCase();
    expect(['.xls', '.xlsx']).toContain(extension);
    
    // Assertion 4: File size should be greater than 0
    const stats = fs.statSync(result!);
    expect(stats.size).toBeGreaterThan(0);
    
    console.log('\n✅ All assertions passed - bug is fixed!');
    console.log(`   File: ${path.basename(result!)}`);
    console.log(`   Size: ${stats.size} bytes`);
    console.log(`   Extension: ${extension}`);
  }, 60000); // 60 second timeout

  /**
   * Additional exploration: Inspect button attributes
   * 
   * This test helps document what the actual button looks like
   * Run this to understand the bug condition better
   */
  test.skip('should inspect COEX download button attributes (manual inspection)', async () => {
    jest.setTimeout(60000);
    
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.goto('https://www.coex.co.kr/event/full-schedules/', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Extract all button/anchor elements and their attributes
      const buttons = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('a, button'));
        return elements.map((el: any) => ({
          tag: el.tagName,
          href: el.href || null,
          text: el.textContent?.trim() || '',
          classes: el.className,
          id: el.id,
          onclick: el.getAttribute('onclick')
        })).filter((el: any) => 
          el.text.includes('다운로드') || 
          el.text.includes('엑셀') ||
          el.href?.includes('download') ||
          el.href?.includes('.xls')
        );
      });

      console.log('\n📋 Found download-related buttons:');
      buttons.forEach((btn: any, idx: number) => {
        console.log(`\n${idx + 1}. ${btn.tag}`);
        console.log(`   Text: "${btn.text}"`);
        console.log(`   Href: ${btn.href}`);
        console.log(`   Classes: ${btn.classes}`);
        console.log(`   ID: ${btn.id}`);
        console.log(`   Onclick: ${btn.onclick}`);
      });

      // This test is for manual inspection only
      expect(buttons.length).toBeGreaterThan(0);
    } finally {
      await browser.close();
    }
  }, 60000);
});
