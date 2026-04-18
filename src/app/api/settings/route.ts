import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { type ReviewSource } from "@/generated/prisma/client";
import { reviewMonitoringService } from "@/server/services/review-monitoring.service";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await reviewMonitoringService.getSettings(userId);
  return NextResponse.json(data);
}

export async function PUT(req: Request) {
  const { userId } = await auth();

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

  await reviewMonitoringService.updateSettings(userId, payload);
  return NextResponse.json({ ok: true });
}
