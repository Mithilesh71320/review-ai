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
  const cursor = searchParams.get("cursor") ?? undefined;
  const limitRaw = Number(searchParams.get("limit") ?? 25);
  const limit = Number.isFinite(limitRaw) ? limitRaw : 25;

  try {
    const data = await reviewMonitoringService.getReviews(userId, managedBusinessId, {
      cursor,
      limit,
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load reviews.";
    logger.error(
      {
        route: "GET /api/reviews",
        userId,
        error: message,
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      },
      "reviews GET failed",
    );
    return NextResponse.json(
      {
        error: !process.env.DATABASE_URL
          ? "Database unavailable. Check DATABASE_URL on Vercel."
          : "Failed to load reviews.",
        ...(process.env.NODE_ENV !== "production" ? { detail: message } : {}),
      },
      { status: 500 },
    );
  }
});
