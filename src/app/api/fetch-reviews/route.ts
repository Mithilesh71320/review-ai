import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { resolveSubscriptionAccessForUser } from "@/lib/billing-access";
import { reviewMonitoringService } from "@/server/services/review-monitoring.service";
import { withApiLogger } from "@/lib/api-logger";

export const POST = withApiLogger(async (req: Request) => {
  const authData = await auth();
  const { userId } = authData;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      managedBusinessId?: string;
      placeId?: string;
      businessName?: string;
    };

    const access = await resolveSubscriptionAccessForUser({
      userId,
      has: authData.has,
    });
    const result = await reviewMonitoringService.fetchLatestReviewsForBusiness(userId, access, {
      managedBusinessId: body.managedBusinessId,
      placeId: body.placeId,
      businessName: body.businessName,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch Google reviews.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
});
