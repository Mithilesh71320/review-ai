import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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

  const business = await prisma.business.upsert({
    where: { placeId },
    update: {
      name: body.businessName?.trim() || data.result.name || "Unknown Business",
    },
    create: {
      placeId,
      name: body.businessName?.trim() || data.result.name || "Unknown Business",
    },
  });

  const reviews = data.result.reviews ?? [];

  const savedReviews = await Promise.all(
    reviews
      .filter((review) => review.text && typeof review.rating === "number")
      .map((review) =>
        prisma.review.create({
          data: {
            businessId: business.id,
            text: review.text as string,
            rating: review.rating as number,
            sentiment: null,
          },
        }),
      ),
  );

  return NextResponse.json({
    business: {
      id: business.id,
      name: business.name,
      placeId: business.placeId,
      rating: data.result.rating ?? null,
    },
    reviews: reviews.map((review) => ({
      author: review.author_name ?? "Anonymous",
      text: review.text ?? "",
      rating: review.rating ?? null,
      date: review.time ? new Date(review.time * 1000).toISOString() : null,
    })),
    storedCount: savedReviews.length,
  });
}
