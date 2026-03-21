import { rateLimit } from "express-rate-limit";

const parseWindowMs = (): number => {
  const raw = process.env.RATE_LIMIT_WINDOW_MS;
  if (!raw) return 60_000;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60_000;
};

const windowMs = parseWindowMs();

export const analyzeLimiter = rateLimit({
  windowMs,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (_req, res, _next, optionsUsed) => {
    res.status(optionsUsed.statusCode).json({
      error: "RATE_LIMITED",
      message: "Rate limit exceeded for /api/analyze.",
      statusCode: optionsUsed.statusCode,
    });
  },
});

export const standardLimiter = rateLimit({
  windowMs,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (_req, res, _next, optionsUsed) => {
    res.status(optionsUsed.statusCode).json({
      error: "RATE_LIMITED",
      message: "Rate limit exceeded.",
      statusCode: optionsUsed.statusCode,
    });
  },
});

