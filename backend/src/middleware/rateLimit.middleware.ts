import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { message: "Too many requests from this IP, please try again later" }
});