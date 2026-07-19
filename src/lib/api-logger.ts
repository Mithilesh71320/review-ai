import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

type RouteHandler = (req: Request, ctx?: unknown) => Promise<NextResponse>;

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
      logger.error({ method, path, status: 500, latency, error: (error as Error).message }, "API error");
      throw error;
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
