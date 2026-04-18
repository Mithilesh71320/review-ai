import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { reviewMonitoringService } from "@/server/services/review-monitoring.service";

export async function GET(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const managedBusinessId = searchParams.get("managedBusinessId") ?? undefined;
    const data = await reviewMonitoringService.getReviewInsights(userId, managedBusinessId);
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate AI insights.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
