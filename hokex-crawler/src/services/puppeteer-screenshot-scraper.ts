/**
 * PuppeteerScreenshotScraper - Captures screenshots and extracts poster images
 * For JavaScript-heavy websites where static scraping fails
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import sharp from 'sharp';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

export interface ScreenshotResult {
  posterUrl: string | null;
  error?: string;
}

export class PuppeteerScreenshotScraper {
  private browser: Browser | null = null;
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Initialize Puppeteer browser
   */
  async init(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
  }

  /**
   * Close Puppeteer browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Capture poster from website using Puppeteer
   * 
   * @param url - Website URL
   * @param eventTitle - Event title for filename
   * @returns Poster URL from Supabase Storage
   */
  async capturePoster(url: string, eventTitle: string): Promise<ScreenshotResult> {
    try {
      await this.init();

      if (!this.browser) {
        throw new Error('Browser not initialized');
      }

      const page = await this.browser.newPage();

      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });

      console.log(`📸 Loading page: ${url}`);

      // Navigate to page
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for images to load
      await page.waitForTimeout(3000);

      // Try to find poster image element
      const posterElement = await this.findPosterElement(page);

      let screenshotBuffer: Buffer;

      if (posterElement) {
        console.log('✅ Found poster element, capturing...');
        // Capture specific element
        screenshotBuffer = await posterElement.screenshot({ type: 'png' });
      } else {
        console.log('⚠️  No specific poster element found, capturing full page...');
        // Capture full page
        screenshotBuffer = await page.screenshot({ type: 'png', fullPage: false });
      }

      await page.close();

      // Optimize image
      const optimizedBuffer = await this.optimizeImage(screenshotBuffer);

      // Upload to Supabase Storage
      const posterUrl = await this.uploadToStorage(optimizedBuffer, eventTitle);

      return { posterUrl };

    } catch (error: any) {
      console.error(`❌ Screenshot capture failed:`, error.message);
      return { posterUrl: null, error: error.message };
    }
  }

  /**
   * Find poster element on page
   */
  private async findPosterElement(page: Page): Promise<any> {
    // Try multiple selectors
    const selectors = [
      'img[alt*="poster" i]',
      'img[alt*="포스터" i]',
      'img[src*="poster" i]',
      'img[class*="poster" i]',
      'img[class*="main" i]',
      'img[class*="hero" i]',
      '.poster img',
      '.main-image img',
      '.hero-image img',
      '[class*="visual"] img',
    ];

    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          // Check if image is large enough (likely a poster)
          const box = await element.boundingBox();
          if (box && box.width > 200 && box.height > 200) {
            return element;
          }
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    return null;
  }

  /**
   * Optimize image (resize, compress)
   */
  private async optimizeImage(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toBuffer();
  }

  /**
   * Upload image to Supabase Storage
   */
  private async uploadToStorage(buffer: Buffer, eventTitle: string): Promise<string> {
    // Generate filename
    const timestamp = Date.now();
    const sanitizedTitle = eventTitle
      .replace(/[^a-zA-Z0-9가-힣]/g, '-')
      .substring(0, 50);
    const filename = `posters/${sanitizedTitle}-${timestamp}.jpg`;

    console.log(`📤 Uploading to Supabase Storage: ${filename}`);

    // Upload to Supabase Storage
    const { data, error } = await this.supabase.storage
      .from('event-posters')
      .upload(filename, buffer, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (error) {
      throw new Error(`Failed to upload to storage: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = this.supabase.storage
      .from('event-posters')
      .getPublicUrl(filename);

    console.log(`✅ Uploaded: ${urlData.publicUrl}`);

    return urlData.publicUrl;
  }
}
