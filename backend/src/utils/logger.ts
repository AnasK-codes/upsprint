import winston from "winston";

const { combine, timestamp, printf, colorize } = winston.format;

const simpleFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `${timestamp} ${level}: ${message}${metaStr}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(
    timestamp(),
    ...(process.env.NODE_ENV !== "production" ? [colorize({ all: true })] : []),
    simpleFormat
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
