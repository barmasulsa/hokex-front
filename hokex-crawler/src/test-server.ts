/**
 * Test Server
 * Simple Express server to test crawler components
 */

import express from 'express';
import { DataValidator } from './core/validator';
import { DataNormalizer } from './core/normalizer';
import { DuplicateDetector } from './core/duplicate';
import { ExcelParser } from './core/excel-parser';
import { NormalizedEventData, RawEventData } from './types/event';

const app = express();
app.use(express.json());

const validator = new DataValidator();
const normalizer = new DataNormalizer();
const duplicateDetector = new DuplicateDetector();
const excelParser = new ExcelParser();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'HOKEX Crawler Test Server is running' });
});

// Test data validation
app.post('/api/test/validate', (req, res) => {
  try {
    const event: NormalizedEventData = req.body;
    const result = validator.validate(event);
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test data normalization
app.post('/api/test/normalize', (req, res) => {
  try {
    const { rawData, venueCode } = req.body as { rawData: RawEventData; venueCode: string };
    const normalized = normalizer.normalize(rawData, venueCode);
    
    res.json({
      success: true,
      normalized
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test duplicate detection
app.post('/api/test/duplicate', async (req, res) => {
  try {
    const { event, existingEvents } = req.body as {
      event: NormalizedEventData;
      existingEvents: Array<NormalizedEventData & { id: string }>;
    };
    
    const result = await duplicateDetector.checkDuplicate(event, existingEvents);
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test data merge
app.post('/api/test/merge', (req, res) => {
  try {
    const { existingEvent, newEvent } = req.body as {
      existingEvent: NormalizedEventData;
      newEvent: NormalizedEventData;
    };
    
    const merged = duplicateDetector.mergeEventData(existingEvent, newEvent);
    
    res.json({
      success: true,
      merged
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get sample data
app.get('/api/test/sample', (req, res) => {
  const sampleRawData: RawEventData = {
    title: '서울 모터쇼 2026',
    startDate: '2026.04.15',
    endDate: '2026.04.25',
    category: '전시회',
    industry: '자동차',
    organizer: '한국자동차산업협회',
    description: '국내 최대 자동차 전시회',
    posterUrl: 'https://example.com/poster.jpg'
  };

  const sampleNormalizedData: NormalizedEventData = {
    title: '서울 모터쇼 2026',
    posterUrl: 'https://example.com/poster.jpg',
    region: '서울',
    venue: '코엑스',
    startDate: '2026-04-15',
    endDate: '2026-04-25',
    dayString: '(화)',
    category: '전시',
    industry: '자동차',
    organizer: '한국자동차산업협회',
    description: '국내 최대 자동차 전시회'
  };

  res.json({
    success: true,
    samples: {
      rawData: sampleRawData,
      normalizedData: sampleNormalizedData
    }
  });
});

// Complete workflow test
app.post('/api/test/workflow', async (req, res) => {
  try {
    const { rawData, venueCode, existingEvents } = req.body as {
      rawData: RawEventData;
      venueCode: string;
      existingEvents?: Array<NormalizedEventData & { id: string }>;
    };

    // Step 1: Normalize
    const normalized = normalizer.normalize(rawData, venueCode);
    
    // Step 2: Validate
    const validationResult = validator.validate(normalized);
    
    // Step 3: Check duplicate (if existing events provided)
    let duplicateResult = null;
    if (existingEvents && existingEvents.length > 0) {
      duplicateResult = await duplicateDetector.checkDuplicate(normalized, existingEvents);
    }

    res.json({
      success: true,
      workflow: {
        step1_normalized: normalized,
        step2_validation: validationResult,
        step3_duplicate: duplicateResult
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Component status
app.get('/api/test/status', (req, res) => {
  res.json({
    success: true,
    components: {
      validator: 'ready',
      normalizer: 'ready',
      duplicateDetector: 'ready',
      excelParser: 'ready'
    },
    endpoints: [
      'GET /health',
      'GET /api/test/sample',
      'GET /api/test/status',
      'POST /api/test/validate',
      'POST /api/test/normalize',
      'POST /api/test/duplicate',
      'POST /api/test/merge',
      'POST /api/test/workflow'
    ]
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   HOKEX Crawler Test Server                               ║
║                                                            ║
║   Server running on: http://localhost:${PORT}              ║
║                                                            ║
║   Available endpoints:                                     ║
║   - GET  /health                                           ║
║   - GET  /api/test/sample                                  ║
║   - GET  /api/test/status                                  ║
║   - POST /api/test/validate                                ║
║   - POST /api/test/normalize                               ║
║   - POST /api/test/duplicate                               ║
║   - POST /api/test/merge                                   ║
║   - POST /api/test/workflow                                ║
║                                                            ║
║   Components loaded:                                       ║
║   ✓ DataValidator                                          ║
║   ✓ DataNormalizer                                         ║
║   ✓ DuplicateDetector                                      ║
║   ✓ ExcelParser                                            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});
