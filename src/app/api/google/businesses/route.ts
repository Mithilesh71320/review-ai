import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { reviewMonitoringService } from "@/server/services/review-monitoring.service";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await reviewMonitoringService.listGoogleBusinesses(userId);
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Google businesses.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
