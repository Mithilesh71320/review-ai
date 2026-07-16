import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { reviewMonitoringService } from "@/server/services/review-monitoring.service";
import { withApiLogger } from "@/lib/api-logger";

export const GET = withApiLogger(async (req: Request) => {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const managedBusinessId = searchParams.get("managedBusinessId") ?? undefined;

  const data = await reviewMonitoringService.getReviews(userId, managedBusinessId);
  return NextResponse.json(data);
});
