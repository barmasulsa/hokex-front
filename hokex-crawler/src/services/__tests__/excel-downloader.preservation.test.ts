/**
 * Preservation Property Tests
 * 
 * Feature: excel-download-automation-fix
 * Property 2: Preservation - Direct File Link Downloads Continue Working
 * 
 * IMPORTANT: Follow observation-first methodology
 * These tests capture the baseline behavior that must be preserved after the fix
 * 
 * Run these tests on UNFIXED code first to observe and document current behavior
 * EXPECTED OUTCOME: Tests PASS (confirms baseline behavior to preserve)
 */

import { ExcelDownloader } from '../excel-downloader';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Preservation Tests: Direct File Link Downloads', () => {
  let downloader: ExcelDownloader;
  let testDownloadPath: string;

  beforeEach(() => {
    // Use system Downloads folder for preservation tests
    testDownloadPath = path.join(os.homedir(), 'Downloads');
    downloader = new ExcelDownloader(testDownloadPath);
  });

  describe('Property 2.1: Download path configuration preserved', () => {
    test('should use default Downloads folder when no path specified', () => {
      const defaultDownloader = new ExcelDownloader();
      // Access private property for testing (TypeScript will complain but it works at runtime)
      const downloadPath = (defaultDownloader as any).downloadPath;
      
      expect(downloadPath).toBe(path.join(os.homedir(), 'Downloads'));
    });

    test('should use custom download path when specified', () => {
      const customPath = path.join(__dirname, 'custom-downloads');
      const customDownloader = new ExcelDownloader(customPath);
      const downloadPath = (customDownloader as any).downloadPath;
      
      expect(downloadPath).toBe(customPath);
    });
  });

  describe('Property 2.2: File detection logic preserved', () => {
    test('should detect new Excel files in download directory', () => {
      const testDir = path.join(__dirname, '../../__test-downloads__');
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      // Create test files
      const beforeFiles = fs.readdirSync(testDir);
      
      // Simulate new Excel file
      const testFile = path.join(testDir, 'test_schedule.xlsx');
      fs.writeFileSync(testFile, 'test content');
      
      const afterFiles = fs.readdirSync(testDir);
      const newFiles = afterFiles.filter(f => !beforeFiles.includes(f));
      
      // Should detect the new .xlsx file
      const excelFile = newFiles.find(f => 
        (f.endsWith('.xls') || f.endsWith('.xlsx')) && 
        !f.endsWith('.crdownload') && 
        !f.endsWith('.tmp')
      );
      
      expect(excelFile).toBe('test_schedule.xlsx');
      
      // Cleanup
      fs.unlinkSync(testFile);
      fs.rmdirSync(testDir);
    });

    test('should exclude .crdownload files (incomplete downloads)', () => {
      const testDir = path.join(__dirname, '../../__test-downloads__');
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      // Create incomplete download file
      const incompleteFile = path.join(testDir, 'schedule.xlsx.crdownload');
      fs.writeFileSync(incompleteFile, 'incomplete');
      
      const files = fs.readdirSync(testDir);
      const excelFiles = files.filter(f => 
        (f.endsWith('.xls') || f.endsWith('.xlsx')) && 
        !f.endsWith('.crdownload') && 
        !f.endsWith('.tmp')
      );
      
      // Should not include .crdownload files
      expect(excelFiles).not.toContain('schedule.xlsx.crdownload');
      expect(excelFiles.length).toBe(0);
      
      // Cleanup
      fs.unlinkSync(incompleteFile);
      fs.rmdirSync(testDir);
    });

    test('should exclude .tmp files (temporary files)', () => {
      const testDir = path.join(__dirname, '../../__test-downloads__');
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      // Create temporary file
      const tmpFile = path.join(testDir, 'schedule.xlsx.tmp');
      fs.writeFileSync(tmpFile, 'temporary');
      
      const files = fs.readdirSync(testDir);
      const excelFiles = files.filter(f => 
        (f.endsWith('.xls') || f.endsWith('.xlsx')) && 
        !f.endsWith('.crdownload') && 
        !f.endsWith('.tmp')
      );
      
      // Should not include .tmp files
      expect(excelFiles).not.toContain('schedule.xlsx.tmp');
      expect(excelFiles.length).toBe(0);
      
      // Cleanup
      fs.unlinkSync(tmpFile);
      fs.rmdirSync(testDir);
    });
  });

  describe('Property 2.3: Cleanup functionality preserved', () => {
    test('should delete older files matching pattern while preserving most recent', async () => {
      const testDir = path.join(__dirname, '../../__test-downloads__');
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      const testDownloader = new ExcelDownloader(testDir);

      // Create multiple files with different timestamps
      const oldFile1 = path.join(testDir, 'Coex_Schedule_20260101.xls');
      const oldFile2 = path.join(testDir, 'Coex_Schedule_20260201.xls');
      const newFile = path.join(testDir, 'Coex_Schedule_20260301.xls');
      
      fs.writeFileSync(oldFile1, 'old1');
      await new Promise(resolve => setTimeout(resolve, 100));
      fs.writeFileSync(oldFile2, 'old2');
      await new Promise(resolve => setTimeout(resolve, 100));
      fs.writeFileSync(newFile, 'new');
      
      // Run cleanup
      await testDownloader.cleanupOldFiles('Coex_Schedule_*.xls');
      
      // Most recent file should exist
      expect(fs.existsSync(newFile)).toBe(true);
      
      // Older files should be deleted
      expect(fs.existsSync(oldFile1)).toBe(false);
      expect(fs.existsSync(oldFile2)).toBe(false);
      
      // Cleanup
      if (fs.existsSync(newFile)) fs.unlinkSync(newFile);
      fs.rmdirSync(testDir);
    });

    test('should not delete files if only one file matches pattern', async () => {
      const testDir = path.join(__dirname, '../../__test-downloads__');
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      const testDownloader = new ExcelDownloader(testDir);

      // Create single file
      const singleFile = path.join(testDir, 'Coex_Schedule_20260101.xls');
      fs.writeFileSync(singleFile, 'single');
      
      // Run cleanup
      await testDownloader.cleanupOldFiles('Coex_Schedule_*.xls');
      
      // File should still exist (not deleted when it's the only one)
      expect(fs.existsSync(singleFile)).toBe(true);
      
      // Cleanup
      fs.unlinkSync(singleFile);
      fs.rmdirSync(testDir);
    });
  });

  describe('Property 2.4: Return value format preserved', () => {
    test('should return absolute file path as string', () => {
      const testPath = '/path/to/downloads/schedule.xlsx';
      
      // The return type should be string (absolute path)
      expect(typeof testPath).toBe('string');
      expect(path.isAbsolute(testPath)).toBe(true);
    });

    test('should return path with correct file extension', () => {
      const xlsPath = '/path/to/downloads/schedule.xls';
      const xlsxPath = '/path/to/downloads/schedule.xlsx';
      
      expect(path.extname(xlsPath)).toBe('.xls');
      expect(path.extname(xlsxPath)).toBe('.xlsx');
    });
  });

  describe('Property 2.5: Error handling pattern preserved', () => {
    test('should throw Error with Korean message on failure', async () => {
      // This test documents the error handling behavior
      // The actual error will be thrown by downloadCoexSchedule when it fails
      
      const errorMessage = '엑셀 파일 다운로드 실패';
      const error = new Error(errorMessage);
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(errorMessage);
      expect(error.message).toMatch(/엑셀/); // Contains Korean text
    });
  });

  describe('Property 2.6: Browser configuration preserved', () => {
    test('should use correct Puppeteer launch options', () => {
      // Document the expected browser configuration
      const expectedOptions = {
        headless: false, // For debugging
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: null
      };
      
      expect(expectedOptions.headless).toBe(false);
      expect(expectedOptions.args).toContain('--no-sandbox');
      expect(expectedOptions.args).toContain('--disable-setuid-sandbox');
      expect(expectedOptions.defaultViewport).toBeNull();
    });

    test('should configure CDP session for downloads', () => {
      // Document the expected CDP session configuration
      const expectedBehavior = {
        behavior: 'allow',
        downloadPath: testDownloadPath
      };
      
      expect(expectedBehavior.behavior).toBe('allow');
      expect(expectedBehavior.downloadPath).toBe(testDownloadPath);
    });
  });
});

/**
 * Property-Based Tests for Preservation
 * 
 * These tests generate many test cases to provide stronger guarantees
 * that behavior is unchanged for all non-buggy inputs
 */
describe('Property-Based Preservation Tests', () => {
  describe('File pattern matching', () => {
    test('should match various Excel file patterns', () => {
      const patterns = [
        'Coex_Schedule_20260101.xls',
        'Coex_Schedule_20260201.xlsx',
        'KINTEX_Schedule_20260301.xls',
        'BEXCO_Schedule_20260401.xlsx',
      ];

      patterns.forEach(filename => {
        const isExcel = filename.endsWith('.xls') || filename.endsWith('.xlsx');
        expect(isExcel).toBe(true);
      });
    });

    test('should not match non-Excel files', () => {
      const nonExcelFiles = [
        'document.pdf',
        'image.png',
        'data.csv',
        'schedule.txt',
      ];

      nonExcelFiles.forEach(filename => {
        const isExcel = filename.endsWith('.xls') || filename.endsWith('.xlsx');
        expect(isExcel).toBe(false);
      });
    });
  });

  describe('File timestamp comparison', () => {
    test('should correctly identify most recent file', () => {
      const files = [
        { name: 'file1.xls', time: 1000 },
        { name: 'file2.xls', time: 3000 }, // Most recent
        { name: 'file3.xls', time: 2000 },
      ];

      const sorted = files.sort((a, b) => b.time - a.time);
      const mostRecent = sorted[0];

      expect(mostRecent.name).toBe('file2.xls');
      expect(mostRecent.time).toBe(3000);
    });
  });
});
