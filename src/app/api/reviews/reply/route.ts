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
    const access = await resolveSubscriptionAccessForUser({
      userId,
      has: authData.has,
    });
    const body = (await req.json()) as
      | { action: "draft"; reviewId: string }
      | { action: "post"; reviewId: string; reply: string };

    if (body.action === "draft") {
      const draft = await reviewMonitoringService.draftReviewReply(userId, access, body.reviewId);
      return NextResponse.json(draft);
    }

    if (body.action === "post") {
      const result = await reviewMonitoringService.postReviewReply(
        userId,
        access,
        body.reviewId,
        body.reply,
      );
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process review reply.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
