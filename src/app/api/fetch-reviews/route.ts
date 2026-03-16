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

type PlaceDetailsV1Response = {
  displayName?: { text?: string };
  rating?: number;
  reviews?: Array<{
    authorAttribution?: { displayName?: string };
    text?: { text?: string };
    rating?: number;
    publishTime?: string;
  }>;
};

function toUnixSeconds(iso: string | undefined) {
  if (!iso) {
    return undefined;
  }
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return undefined;
  }
  return Math.floor(ms / 1000);
}

function normalizeV1Reviews(data: PlaceDetailsV1Response): {
  name?: string;
  rating?: number;
  reviews: GoogleReview[];
} {
  return {
    name: data.displayName?.text,
    rating: data.rating,
    reviews:
      data.reviews?.map((review) => ({
        author_name: review.authorAttribution?.displayName,
        text: review.text?.text,
        rating: review.rating,
        time: toUnixSeconds(review.publishTime),
      })) ?? [],
  };
}

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

  const accessToken = await reviewMonitoringService.getValidGoogleAccessToken(userId);

  let placeName: string | undefined;
  let placeRating: number | undefined;
  let reviews: GoogleReview[] = [];

  if (accessToken) {
    const v1Res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Goog-FieldMask": "displayName,rating,reviews",
      },
      cache: "no-store",
    });

    if (v1Res.ok) {
      const v1Data = (await v1Res.json()) as PlaceDetailsV1Response;
      const normalized = normalizeV1Reviews(v1Data);
      placeName = normalized.name;
      placeRating = normalized.rating;
      reviews = normalized.reviews;
    }
  }

  if (reviews.length === 0) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Google auth missing for this user and GOOGLE_PLACES_API_KEY is not configured.",
        },
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

    placeName = data.result.name;
    placeRating = data.result.rating;
    reviews = data.result.reviews ?? [];
  }

  const result = await reviewMonitoringService.ingestGoogleReviews(
    userId,
    placeId,
    body.businessName || placeName,
    reviews,
    placeRating,
  );

  return NextResponse.json(result);
}
