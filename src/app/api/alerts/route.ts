import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { type AlertType } from "@/generated/prisma/client";
import { reviewMonitoringService } from "@/server/services/review-monitoring.service";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await reviewMonitoringService.getAlerts(userId);
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as
    | { action: "markAllRead" }
    | { action: "toggleRule"; type: AlertType; enabled: boolean };

  if (body.action === "markAllRead") {
    await reviewMonitoringService.markAllAlertsRead(userId);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "toggleRule") {
    await reviewMonitoringService.updateAlertRule(userId, body.type, body.enabled);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
