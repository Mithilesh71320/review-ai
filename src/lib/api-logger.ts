import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

type RouteHandler = (req: Request, ctx?: unknown) => Promise<NextResponse>;

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Internal server error";
}

export function withApiLogger(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    const start = Date.now();
    const { method } = req;
    const url = new URL(req.url);
    const path = url.pathname;

    let response: NextResponse;
    try {
      response = await handler(req, ctx);
    } catch (error) {
      const latency = Date.now() - start;
      const message = errorMessage(error);
      logger.error(
        {
          method,
          path,
          status: 500,
          latency,
          error: message,
          stack: error instanceof Error ? error.stack : undefined,
        },
        "API error",
      );

      // Return JSON so the client and Vercel logs show a useful message
      // instead of an opaque Next.js HTML 500.
      return NextResponse.json(
        {
          error:
            process.env.NODE_ENV === "production"
              ? "Internal server error"
              : message,
          ...(process.env.NODE_ENV !== "production" ? { detail: message } : {}),
        },
        { status: 500 },
      );
    }

    const latency = Date.now() - start;
    const status = response.status;

    if (status >= 400) {
      logger.warn({ method, path, status, latency }, "API response");
    } else {
      logger.info({ method, path, status, latency }, "API response");
    }

    return response;
  };
}
