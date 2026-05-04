/**
 * Logging utility with Winston
 * Implements Requirements 5.1, 5.3: Structured error logging
 */

import winston from 'winston';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface ErrorContext {
  venueCode?: string;
  venueName?: string;
  eventTitle?: string;
  jobId?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  additionalInfo?: Record<string, unknown>;
}

// Create Winston logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // File output for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    // File output for all logs
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

/**
 * Log an error with context
 */
export function logError(error: Error, context: ErrorContext = {}) {
  const errorLog = {
    type: error.name,
    message: error.message,
    stack: error.stack,
    venueCode: context.venueCode,
    venueName: context.venueName,
    eventTitle: context.eventTitle,
    jobId: context.jobId,
    severity: context.severity || 'medium',
    timestamp: new Date().toISOString(),
    ...context.additionalInfo
  };

  logger.error('Error occurred', errorLog);

  // TODO: Send admin notification for critical errors
  if (context.severity === 'critical') {
    // sendAdminNotification(errorLog);
  }

  return errorLog;
}

/**
 * Log a warning
 */
export function logWarning(message: string, context: Record<string, unknown> = {}) {
  logger.warn(message, {
    timestamp: new Date().toISOString(),
    ...context
  });
}

/**
 * Log info message
 */
export function logInfo(message: string, context: Record<string, unknown> = {}) {
  logger.info(message, {
    timestamp: new Date().toISOString(),
    ...context
  });
}

/**
 * Log debug message
 */
export function logDebug(message: string, context: Record<string, unknown> = {}) {
  logger.debug(message, {
    timestamp: new Date().toISOString(),
    ...context
  });
}

export default logger;
