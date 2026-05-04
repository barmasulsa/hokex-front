/**
 * Base Venue Adapter
 * Implements Requirements 1.3, 1.4: Venue-specific data extraction
 * 
 * Provides interface and base implementation for venue adapters
 */

import axios from 'axios';
import { RawEventData, Region, Venue } from '../types/event';
import { retryWithBackoff } from '../utils/retry';
import { ExcelParser, ParseOptions } from '../core/excel-parser';

/**
 * Venue Adapter interface
 * Each venue must implement this interface
 */
export interface VenueAdapter {
  venueCode: string;
  venueName: Venue;
  region: Region;

  /**
   * Get Excel file download URL from venue website
   */
  getExcelFileUrl(): Promise<string>;

  /**
   * Download Excel file from URL
   */
  downloadExcelFile(url: string): Promise<Buffer>;

  /**
   * Parse Excel file and extract event data
   */
  parseExcelFile(fileBuffer: Buffer): Promise<RawEventData[]>;

  /**
   * Get file format (xlsx, xls, csv)
   */
  getFileFormat(): 'xlsx' | 'xls' | 'csv';

  /**
   * Get parse options (column mappings, sheet name, etc.)
   */
  getParseOptions(): ParseOptions;
}

/**
 * Base Venue Adapter abstract class
 * Provides common functionality for all venue adapters
 */
export abstract class BaseVenueAdapter implements VenueAdapter {
  abstract venueCode: string;
  abstract venueName: Venue;
  abstract region: Region;

  protected excelParser: ExcelParser;
  protected downloadTimeout: number = 60000; // 60 seconds

  constructor() {
    this.excelParser = new ExcelParser();
  }

  /**
   * Get Excel file download URL
   * Must be implemented by each venue adapter
   */
  abstract getExcelFileUrl(): Promise<string>;

  /**
   * Get file format
   * Must be implemented by each venue adapter
   */
  abstract getFileFormat(): 'xlsx' | 'xls' | 'csv';

  /**
   * Get parse options
   * Must be implemented by each venue adapter
   */
  abstract getParseOptions(): ParseOptions;

  /**
   * Download Excel file from URL with retry logic
   * 
   * @param url - URL to download from
   * @returns File buffer
   */
  async downloadExcelFile(url: string): Promise<Buffer> {
    return retryWithBackoff(async () => {
      try {
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: this.downloadTimeout,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        return Buffer.from(response.data);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`Failed to download Excel file: ${error.message}`);
        }
        throw error;
      }
    }, 3);
  }

  /**
   * Parse Excel file and extract event data
   * 
   * @param fileBuffer - Excel file buffer
   * @returns Array of raw event data
   */
  async parseExcelFile(fileBuffer: Buffer): Promise<RawEventData[]> {
    try {
      const options = this.getParseOptions();
      return this.excelParser.parseExcelFile(fileBuffer, options);
    } catch (error) {
      throw new Error(
        `Failed to parse Excel file for ${this.venueName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Fetch all events from venue
   * Complete workflow: get URL → download → parse
   * 
   * @returns Array of raw event data
   */
  async fetchEvents(): Promise<RawEventData[]> {
    try {
      // Get Excel file URL
      const url = await this.getExcelFileUrl();

      // Download Excel file
      const fileBuffer = await this.downloadExcelFile(url);

      // Parse Excel file
      const events = await this.parseExcelFile(fileBuffer);

      return events;
    } catch (error) {
      throw new Error(
        `Failed to fetch events from ${this.venueName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate Excel file before parsing
   * 
   * @param fileBuffer - File buffer to validate
   * @returns True if valid
   */
  protected validateExcelFile(fileBuffer: Buffer): boolean {
    return this.excelParser.isValidExcelFile(fileBuffer);
  }

  /**
   * Get sheet names from Excel file
   * Useful for debugging and configuration
   * 
   * @param fileBuffer - Excel file buffer
   * @returns Array of sheet names
   */
  protected getSheetNames(fileBuffer: Buffer): string[] {
    return this.excelParser.getSheetNames(fileBuffer);
  }
}
