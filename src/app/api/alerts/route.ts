import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { type AlertType } from "@/generated/prisma/client";
import { reviewMonitoringService } from "@/server/services/review-monitoring.service";
import { withApiLogger } from "@/lib/api-logger";

export const GET = withApiLogger(async (req: Request) => {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const managedBusinessId = searchParams.get("managedBusinessId") ?? undefined;

  const data = await reviewMonitoringService.getAlerts(userId, managedBusinessId);
  return NextResponse.json(data);
});

export const PATCH = withApiLogger(async (req: Request) => {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as
    | { action: "markAllRead"; managedBusinessId?: string }
    | { action: "toggleRule"; type: AlertType; enabled: boolean };

  if (body.action === "markAllRead") {
    await reviewMonitoringService.markAllAlertsRead(userId, body.managedBusinessId);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "toggleRule") {
    await reviewMonitoringService.updateAlertRule(userId, body.type, body.enabled);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
});
