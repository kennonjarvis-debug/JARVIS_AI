import winston from 'winston';

const { combine, timestamp, printf, colorize, json } = winston.format;

// Development-friendly format with correlation IDs
const devLogFormat = printf(({ level, message, timestamp, correlationId, ...metadata }) => {
  const corrId = correlationId ? `[${correlationId}] ` : '';
  const meta = Object.keys(metadata).length > 0 ? ` ${JSON.stringify(metadata)}` : '';
  return `[${timestamp}] ${level}: ${corrId}${message}${meta}`;
});

// Production JSON format with correlation IDs
const prodLogFormat = combine(
  timestamp(),
  json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? prodLogFormat : combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    devLogFormat
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ],
  defaultMeta: process.env.NODE_ENV === 'production' ? { service: 'jarvis-control-plane' } : undefined
});

// Helper to create a child logger with correlation ID
export const withCorrelationId = (correlationId: string) => {
  return logger.child({ correlationId });
};

export default logger;
