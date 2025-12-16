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
  res.status(status).json({ message: err.message || "Internal Server Error" });
}
