import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { type ReviewSource } from "@/generated/prisma/client";
import { resolveSubscriptionAccessForUser } from "@/lib/billing-access";
import { reviewMonitoringService } from "@/server/services/review-monitoring.service";
import { withApiLogger } from "@/lib/api-logger";
import { logger } from "@/lib/logger";

export const GET = withApiLogger(async () => {
  const authData = await auth();
  const { userId } = authData;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const access = await resolveSubscriptionAccessForUser({
      userId,
      has: authData.has,
    });
    const data = await reviewMonitoringService.getSettings(userId, access);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load settings.";
    logger.error(
      {
        route: "GET /api/settings",
        userId,
        error: message,
        stack: error instanceof Error ? error.stack : undefined,
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      },
      "settings GET failed",
    );

    // Surface actionable hints for common deploy misconfigurations
    const isDbConfig =
      !process.env.DATABASE_URL ||
      /database|prisma|p1001|p1000|p1017|connect|timeout|env/i.test(message);

    return NextResponse.json(
      {
        error: isDbConfig
          ? "Database unavailable. Check DATABASE_URL on Vercel and that migrations are applied."
          : "Failed to load settings.",
        ...(process.env.NODE_ENV !== "production" ? { detail: message } : {}),
      },
      { status: 500 },
    );
  }
});

export const PUT = withApiLogger(async (req: Request) => {
  const authData = await auth();
  const { userId } = authData;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await req.json()) as {
    business: {
      name: string;
      email: string;
      phone: string;
      website: string;
      placeId: string;
    };
    notifications: {
      emailNotifications: boolean;
      pushNotifications: boolean;
      smsNotifications: boolean;
      weeklyDigest: boolean;
    };
    ai: {
      provider: string;
      sentimentModel: string;
      analysisLanguage: string;
      autoRespond: boolean;
      businessContext?: string;
    };
    sources: Array<{ key: ReviewSource; connected: boolean }>;
    businesses: Array<{
      id?: string;
      name: string;
      placeId: string;
      accountName?: string | null;
      locationName?: string | null;
      mapsUri?: string | null;
    }>;
  };

  try {
    const access = await resolveSubscriptionAccessForUser({
      userId,
      has: authData.has,
    });
    await reviewMonitoringService.updateSettings(userId, access, payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save settings.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
});
