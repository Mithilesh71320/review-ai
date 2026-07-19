import pino from "pino";

/**
 * Avoid pino-pretty transport on Vercel/serverless — it can crash workers.
 * Pretty logs only in local development.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  ...(process.env.NODE_ENV === "development" && process.env.VERCEL !== "1"
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }
    : {}),
});
