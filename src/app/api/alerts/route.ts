import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { type AlertType } from "@prisma/client";
import { reviewMonitoringService } from "@/server/services/review-monitoring.service";
import { withApiLogger } from "@/lib/api-logger";
import { logger } from "@/lib/logger";

export const GET = withApiLogger(async (req: Request) => {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const managedBusinessId = searchParams.get("managedBusinessId") ?? undefined;
  const cursor = searchParams.get("cursor") ?? undefined;
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : 25;

  try {
    const data = await reviewMonitoringService.getAlerts(userId, managedBusinessId, {
      cursor,
      limit: Number.isFinite(limit) ? limit : 25,
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load alerts.";
    logger.error(
      {
        route: "GET /api/alerts",
        userId,
        error: message,
        stack: error instanceof Error ? error.stack : undefined,
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      },
      "alerts GET failed",
    );

    const isDbConfig =
      !process.env.DATABASE_URL ||
      /database|prisma|p1001|p1000|p1017|connect|timeout|env|query engine|engine/i.test(
        message,
      );

    return NextResponse.json(
      {
        error: isDbConfig
          ? "Database unavailable. Check DATABASE_URL on Vercel and that prisma generate runs on build."
          : "Failed to load alerts.",
        ...(process.env.NODE_ENV !== "production" ? { detail: message } : {}),
      },
      { status: 500 },
    );
  }
});

export const PATCH = withApiLogger(async (req: Request) => {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as
    | { action: "markAllRead"; managedBusinessId?: string }
    | { action: "toggleRule"; type: AlertType; enabled: boolean };

  try {
    if (body.action === "markAllRead") {
      await reviewMonitoringService.markAllAlertsRead(userId, body.managedBusinessId);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "toggleRule") {
      await reviewMonitoringService.updateAlertRule(userId, body.type, body.enabled);
      return NextResponse.json({ ok: true });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update alerts.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
});
