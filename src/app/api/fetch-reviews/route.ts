import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { reviewMonitoringService } from "@/server/services/review-monitoring.service";

type GoogleReview = {
  author_name?: string;
  text?: string;
  rating?: number;
  time?: number;
};

type PlaceDetailsResponse = {
  status: string;
  result?: {
    name?: string;
    rating?: number;
    reviews?: GoogleReview[];
  };
  error_message?: string;
};

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { placeId?: string; businessName?: string };
  const placeId = body.placeId?.trim();

  if (!placeId) {
    return NextResponse.json({ error: "placeId is required" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_PLACES_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "name,rating,reviews");
  url.searchParams.set("key", apiKey);

  const googleRes = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!googleRes.ok) {
    return NextResponse.json(
      { error: "Failed to fetch Google place details" },
      { status: 502 },
    );
  }

  const data = (await googleRes.json()) as PlaceDetailsResponse;

  if (data.status !== "OK" || !data.result) {
    return NextResponse.json(
      { error: data.error_message || "Google Places API request failed" },
      { status: 400 },
    );
  }

  const result = await reviewMonitoringService.ingestGoogleReviews(
    userId,
    placeId,
    body.businessName || data.result.name,
    data.result.reviews ?? [],
    data.result.rating,
  );

  return NextResponse.json(result);
}
