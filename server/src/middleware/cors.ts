import cors from "cors";

const allowedOrigin: string | undefined = (() => {
  const appUrl = process.env.APP_URL;
  if (!appUrl) return undefined;

  // Prefer extracting the origin in case APP_URL includes a path.
  try {
    return new URL(appUrl).origin;
  } catch {
    return appUrl;
  }
})();

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (curl/health checks/server-to-server) with no Origin header.
    if (!origin) return callback(null, true);

    if (!allowedOrigin) {
      return callback(new Error(`CORS origin not allowed: ${origin}`), false);
    }

    if (origin === allowedOrigin) return callback(null, true);

    return callback(new Error(`CORS origin not allowed: ${origin}`), false);
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
});

