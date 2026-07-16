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
  const query = searchParams.get("query")?.trim() ?? "";

  try {
    const data = await reviewMonitoringService.searchGooglePlaces(query);
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to search Google Places.";
    const status =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
});
