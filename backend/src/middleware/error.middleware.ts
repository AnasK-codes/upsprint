import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger.js";
export default function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error(err.message || "Unhandled error", { stack: err.stack });

  const status = err.status || 500;

  // Public message: Use default for 500s to avoid leaking internals
  let message = err.message || "Internal Server Error";
  if (status === 500) {
    message = "Internal Server Error";
  }

  res.status(status).json({
    message,
    // Only include stack in development
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}
