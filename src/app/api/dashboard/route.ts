import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
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
  const trendDaysRaw = Number(searchParams.get("trendDays") ?? 30);
  const trendDays = Number.isFinite(trendDaysRaw) ? trendDaysRaw : 30;

  try {
    const data = await reviewMonitoringService.getDashboard(
      userId,
      managedBusinessId,
      trendDays,
    );
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load dashboard.";
    logger.error(
      {
        route: "GET /api/dashboard",
        userId,
        error: message,
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      },
      "dashboard GET failed",
    );
    return NextResponse.json(
      {
        error: !process.env.DATABASE_URL
          ? "Database unavailable. Check DATABASE_URL on Vercel."
          : "Failed to load dashboard.",
        ...(process.env.NODE_ENV !== "production" ? { detail: message } : {}),
      },
      { status: 500 },
    );
  }
});
