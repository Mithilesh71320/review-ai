import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { reviewMonitoringService } from "@/server/services/review-monitoring.service";

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      managedBusinessId?: string;
      placeId?: string;
      businessName?: string;
    };

    const result = await reviewMonitoringService.fetchLatestReviewsForBusiness(userId, {
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
}
