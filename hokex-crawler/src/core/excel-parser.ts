/**
 * Excel Parser
 * Implements Requirements 1.1, 1.2: Excel file parsing
 * 
 * Supports multiple formats:
 * - XLSX (Excel 2007+)
 * - XLS (Excel 97-2003)
 * - CSV
 */

import * as xlsx from 'xlsx';
import { RawEventData } from '../types/event';

export interface ColumnMapping {
  title: string;
  startDate: string;
  endDate: string;
  posterUrl?: string;
  category?: string;
  industry?: string;
  organizer?: string;
  supervisor?: string;
  description?: string;
  admissionFee?: string;
  operatingHours?: string;
  contact?: string;
  address?: string;
  targetLink?: string;
}

export interface ParseOptions {
  columnMapping: ColumnMapping;
  sheetName?: string;
  skipRows?: number;
  fileFormat: 'xlsx' | 'xls' | 'csv';
}

/**
 * Excel Parser class
 * Parses Excel files and extracts event data
 */
export class ExcelParser {
  /**
   * Parse Excel file and extract event data
   * 
   * @param fileBuffer - Excel file buffer
   * @param options - Parse options with column mappings
   * @returns Array of raw event data
   */
  parseExcelFile(fileBuffer: Buffer, options: ParseOptions): RawEventData[] {
    try {
      // Read workbook from buffer
      const workbook = xlsx.read(fileBuffer, {
        type: 'buffer',
        cellDates: true,
        cellNF: false,
        cellText: false
      });

      // Get sheet to parse
      const sheetName = options.sheetName || workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      if (!sheet) {
        throw new Error(`Sheet "${sheetName}" not found in workbook`);
      }

      // Convert sheet to JSON
      const rows = xlsx.utils.sheet_to_json(sheet, {
        raw: false,
        defval: null
      });

      // Skip header rows if specified
      const dataRows = options.skipRows ? rows.slice(options.skipRows) : rows;

      // Extract event data from rows
      const events: RawEventData[] = [];
      for (const row of dataRows) {
        const event = this.extractEventFromRow(row as Record<string, any>, options.columnMapping);
        
        // Only add if required fields are present
        if (event && event.title && event.startDate && event.endDate) {
          events.push(event);
        }
      }

      return events;
    } catch (error) {
      throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract event data from a single row
   * 
   * @param row - Row data as key-value pairs
   * @param mapping - Column mapping configuration
   * @returns Raw event data or null if required fields missing
   */
  private extractEventFromRow(
    row: Record<string, any>,
    mapping: ColumnMapping
  ): RawEventData | null {
    // Extract required fields
    const title = this.getFieldValue(row, mapping.title);
    const startDate = this.getFieldValue(row, mapping.startDate);
    const endDate = this.getFieldValue(row, mapping.endDate);

    // Skip if required fields are missing
    if (!title || !startDate || !endDate) {
      return null;
    }

    // Extract optional fields
    const event: RawEventData = {
      title: this.cleanString(title),
      startDate: this.cleanString(startDate),
      endDate: this.cleanString(endDate)
    };

    // Add optional fields if present
    if (mapping.posterUrl) {
      const posterUrl = this.getFieldValue(row, mapping.posterUrl);
      if (posterUrl) {
        event.posterUrl = this.cleanString(posterUrl);
      }
    }

    if (mapping.category) {
      const category = this.getFieldValue(row, mapping.category);
      if (category) {
        event.category = this.cleanString(category);
      }
    }

    if (mapping.industry) {
      const industry = this.getFieldValue(row, mapping.industry);
      if (industry) {
        event.industry = this.cleanString(industry);
      }
    }

    if (mapping.organizer) {
      const organizer = this.getFieldValue(row, mapping.organizer);
      if (organizer) {
        event.organizer = this.cleanString(organizer);
      }
    }

    if (mapping.supervisor) {
      const supervisor = this.getFieldValue(row, mapping.supervisor);
      if (supervisor) {
        event.supervisor = this.cleanString(supervisor);
      }
    }

    if (mapping.description) {
      const description = this.getFieldValue(row, mapping.description);
      if (description) {
        event.description = this.cleanString(description);
      }
    }

    if (mapping.admissionFee) {
      const admissionFee = this.getFieldValue(row, mapping.admissionFee);
      if (admissionFee) {
        event.admissionFee = this.cleanString(admissionFee);
      }
    }

    if (mapping.operatingHours) {
      const operatingHours = this.getFieldValue(row, mapping.operatingHours);
      if (operatingHours) {
        event.operatingHours = this.cleanString(operatingHours);
      }
    }

    if (mapping.contact) {
      const contact = this.getFieldValue(row, mapping.contact);
      if (contact) {
        event.contact = this.cleanString(contact);
      }
    }

    if (mapping.address) {
      const address = this.getFieldValue(row, mapping.address);
      if (address) {
        event.address = this.cleanString(address);
      }
    }

    if (mapping.targetLink) {
      const targetLink = this.getFieldValue(row, mapping.targetLink);
      if (targetLink) {
        event.targetLink = this.cleanString(targetLink);
      }
    }

    return event;
  }

  /**
   * Get field value from row by column name
   * Handles case-insensitive column name matching
   * 
   * @param row - Row data
   * @param columnName - Column name to look for
   * @returns Field value or null
   */
  private getFieldValue(row: Record<string, any>, columnName: string): string | null {
    // Try exact match first
    if (row[columnName] !== undefined && row[columnName] !== null) {
      return String(row[columnName]);
    }

    // Try case-insensitive match
    const lowerColumnName = columnName.toLowerCase();
    for (const key in row) {
      if (key.toLowerCase() === lowerColumnName) {
        const value = row[key];
        if (value !== undefined && value !== null) {
          return String(value);
        }
      }
    }

    return null;
  }

  /**
   * Clean string value
   * - Trim whitespace
   * - Remove null/undefined
   * - Convert to string
   * 
   * @param value - Value to clean
   * @returns Cleaned string
   */
  private cleanString(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value).trim();
  }

  /**
   * Parse CSV file
   * CSV files are handled by xlsx library as well
   * 
   * @param fileBuffer - CSV file buffer
   * @param options - Parse options
   * @returns Array of raw event data
   */
  parseCsvFile(fileBuffer: Buffer, options: ParseOptions): RawEventData[] {
    // CSV parsing is handled by xlsx library
    return this.parseExcelFile(fileBuffer, options);
  }

  /**
   * Validate Excel file format
   * 
   * @param fileBuffer - File buffer to validate
   * @returns True if valid Excel file
   */
  isValidExcelFile(fileBuffer: Buffer): boolean {
    try {
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      return workbook.SheetNames.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get sheet names from Excel file
   * 
   * @param fileBuffer - Excel file buffer
   * @returns Array of sheet names
   */
  getSheetNames(fileBuffer: Buffer): string[] {
    try {
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      return workbook.SheetNames;
    } catch (error) {
      throw new Error(`Failed to read Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
