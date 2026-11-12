import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";

interface Schemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Validate (and normalise) req.body / req.query / req.params with zod.
 * On failure responds 400 `{ message, errors }`; `message` is the first issue so
 * the existing frontend error display keeps working.
 */
export const validate =
  (schemas: Schemas) => (req: Request, res: Response, next: NextFunction) => {
    for (const key of ["params", "query", "body"] as const) {
      const schema = schemas[key];
      if (!schema) continue;

      const result = schema.safeParse(req[key] ?? {});
      if (!result.success) {
        const errors = result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        }));
        return res.status(400).json({ message: errors[0]?.message ?? "Invalid request", errors });
      }

      // Express 5 exposes req.query/req.params as getters, so define an own property.
      Object.defineProperty(req, key, {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    next();
  };
