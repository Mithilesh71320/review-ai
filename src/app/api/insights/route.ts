import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { resolveSubscriptionAccessForUser } from "@/lib/billing-access";
import { reviewMonitoringService } from "@/server/services/review-monitoring.service";
import { withApiLogger } from "@/lib/api-logger";

export const GET = withApiLogger(async (req: Request) => {
  const authData = await auth();
  const { userId } = authData;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const managedBusinessId = searchParams.get("managedBusinessId") ?? undefined;
    const access = await resolveSubscriptionAccessForUser({
      userId,
      has: authData.has,
    });
    const data = await reviewMonitoringService.getReviewInsights(userId, access, managedBusinessId);
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate AI insights.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
