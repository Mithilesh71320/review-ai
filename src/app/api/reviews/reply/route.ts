import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { reviewMonitoringService } from "@/server/services/review-monitoring.service";

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as
      | { action: "draft"; reviewId: string }
      | { action: "post"; reviewId: string; reply: string };

    if (body.action === "draft") {
      const draft = await reviewMonitoringService.draftReviewReply(userId, body.reviewId);
      return NextResponse.json(draft);
    }

    if (body.action === "post") {
      const result = await reviewMonitoringService.postReviewReply(
        userId,
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
}
