import crypto from "node:crypto";
import {
  googleStarRatingToNumber,
  toUnixSeconds,
  type GoogleAccountListResponse,
  type GoogleBusinessLocationsResponse,
  type GoogleLocationReviewsResponse,
  type GooglePlaceSearchResponse,
  type GoogleReview,
  type GoogleTokenRefreshResponse,
} from "@/server/domain/google/types";
import { GoogleApiError } from "@/server/domain/google/types";
import { formatStorefrontAddress } from "@/server/domain/formatting";
import { reviewMonitoringRepository } from "@/server/repositories/review-monitoring.repository";

export class GoogleService {
  async connectGoogleTokens(
    userId: string,
    tokens: {
      accessToken: string;
      refreshToken?: string;
      expiresIn?: number;
      tokenType?: string;
      scope?: string;
    },
  ) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const expiresAt = typeof tokens.expiresIn === "number" ? new Date(Date.now() + tokens.expiresIn * 1000) : null;

    await reviewMonitoringRepository.updateSourceTokens(workspace.id, "GOOGLE", {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? undefined,
      accessTokenExpiresAt: expiresAt,
      tokenType: tokens.tokenType ?? null,
      scope: tokens.scope ?? null,
      connected: true,
    });
  }

  async getValidGoogleAccessToken(userId: string) {
    const workspace = await reviewMonitoringRepository.ensureWorkspace(userId);
    const source = await reviewMonitoringRepository.getSourceConnection(workspace.id, "GOOGLE");

    if (!source) return null;

    const tokenLooksUsable =
      source.accessToken && source.accessTokenExpiresAt && source.accessTokenExpiresAt.getTime() > Date.now() + 60_000;

    if (tokenLooksUsable) return source.accessToken;

    if (!source.refreshToken) return null;

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error(
        "Google OAuth client config missing. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.",
      );
    }

    const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: source.refreshToken,
        grant_type: "refresh_token",
      }),
      cache: "no-store",
    });

    const refreshData = (await refreshRes.json()) as GoogleTokenRefreshResponse;

    if (!refreshRes.ok || !refreshData.access_token) {
      await reviewMonitoringRepository.updateSourceTokens(workspace.id, "GOOGLE", { connected: false });
      return null;
    }

    const expiresAt = new Date(Date.now() + (refreshData.expires_in ?? 3600) * 1000);
    await reviewMonitoringRepository.updateSourceTokens(workspace.id, "GOOGLE", {
      accessToken: refreshData.access_token,
      accessTokenExpiresAt: expiresAt,
      tokenType: refreshData.token_type ?? "Bearer",
      scope: refreshData.scope ?? source.scope,
      connected: true,
    });

    return refreshData.access_token;
  }

  async listGoogleBusinesses(userId: string) {
    const accessToken = await this.getValidGoogleAccessToken(userId);

    if (!accessToken) {
      return {
        connected: false,
        businesses: [] as Array<{
          accountName: string;
          locationName: string;
          title: string;
          placeId: string | null;
          address: string | null;
          mapsUri: string | null;
        }>,
      };
    }

    const accountsRes = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!accountsRes.ok) throw new Error("Failed to fetch Google Business accounts.");

    const accountsData = (await accountsRes.json()) as GoogleAccountListResponse;
    const accounts = accountsData.accounts ?? [];

    const locationResults = await Promise.all(
      accounts.map(async (account) => {
        const locationsRes = await fetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title,storefrontAddress,metadata`,
          { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
        );

        if (!locationsRes.ok) return [];

        const locationsData = (await locationsRes.json()) as GoogleBusinessLocationsResponse;

        return (locationsData.locations ?? []).map((location) => ({
          accountName: account.accountName ?? account.name,
          locationName: location.name,
          title: location.title ?? "Untitled business",
          placeId: location.metadata?.placeId ?? null,
          mapsUri: location.metadata?.mapsUri ?? null,
          address: formatStorefrontAddress(location.storefrontAddress),
        }));
      }),
    );

    return { connected: true, businesses: locationResults.flat() };
  }

  async searchGooglePlaces(query: string) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY is not configured.");

    const trimmedQuery = query.trim();
    if (!trimmedQuery)
      return { places: [] as Array<{ placeId: string; name: string; address: string | null; rating: number | null; userRatingCount: number | null }> };

    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount",
      },
      body: JSON.stringify({ textQuery: trimmedQuery, pageSize: 8 }),
      cache: "no-store",
    });

    const data = (await response.json()) as GooglePlaceSearchResponse;

    if (!response.ok) {
      const googleMessage = data.error?.message?.trim();
      const fallbackMessage = "Failed to search Google Places.";
      const message =
        response.status === 403 && googleMessage
          ? `Google Places access denied: ${googleMessage}`
          : googleMessage || fallbackMessage;

      throw new GoogleApiError(message, response.status);
    }

    return {
      places: (data.places ?? [])
        .filter((place): place is NonNullable<typeof place> & { id: string } => Boolean(place.id))
        .map((place) => ({
          placeId: place.id,
          name: place.displayName?.text ?? "Unknown place",
          address: place.formattedAddress ?? null,
          rating: place.rating ?? null,
          userRatingCount: place.userRatingCount ?? null,
        })),
    };
  }

  async resolvePlaceIdFromBusinessName(query: string) {
    const result = await this.searchGooglePlaces(query);
    const bestMatch = result.places[0];

    if (!bestMatch) throw new Error("No Google Place match found for that business name.");

    return bestMatch;
  }

  async fetchGoogleBusinessProfileReviews(accessToken: string, locationName: string) {
    const response = await fetch(
      `https://mybusiness.googleapis.com/v4/${locationName}/reviews?pageSize=5&orderBy=updateTime desc`,
      { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
    );

    if (!response.ok) return { reviews: [] as GoogleReview[], rating: undefined as number | undefined };

    const payload = (await response.json()) as GoogleLocationReviewsResponse;

    return {
      rating: payload.averageRating,
      reviews:
        payload.reviews?.map((review) => ({
          author_name: review.reviewer?.displayName,
          text: review.comment,
          rating: googleStarRatingToNumber(review.starRating),
          time: toUnixSeconds(review.createTime),
          review_resource_name: review.name,
          review_reply: review.reviewReply?.comment,
          review_replied_at: review.reviewReply?.updateTime,
        })) ?? [],
    };
  }

  async fetchGooglePlacesReviews(placeId: string, accessToken?: string) {
    let placeName: string | undefined;
    let placeRating: number | undefined;
    let reviews: GoogleReview[] = [];

    if (accessToken) {
      const v1Res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}`, "X-Goog-FieldMask": "displayName,rating,reviews" },
        cache: "no-store",
      });

      if (v1Res.ok) {
        const v1Data = (await v1Res.json()) as {
          displayName?: { text?: string };
          rating?: number;
          reviews?: Array<{ authorAttribution?: { displayName?: string }; text?: { text?: string }; rating?: number; publishTime?: string }>;
        };

        placeName = v1Data.displayName?.text;
        placeRating = v1Data.rating;
        reviews =
          v1Data.reviews?.map((review) => ({
            author_name: review.authorAttribution?.displayName,
            text: review.text?.text,
            rating: review.rating,
            time: toUnixSeconds(review.publishTime),
          })) ?? [];
      }
    }

    if (reviews.length > 0) return { name: placeName, rating: placeRating, reviews };

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) throw new Error("Google auth missing for this user and GOOGLE_PLACES_API_KEY is not configured.");

    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("fields", "name,rating,reviews");
    url.searchParams.set("reviews_sort", "newest");
    url.searchParams.set("key", apiKey);

    const googleRes = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!googleRes.ok) throw new Error("Failed to fetch Google place details");

    const data = (await googleRes.json()) as {
      status: string;
      result?: { name?: string; rating?: number; reviews?: GoogleReview[] };
      error_message?: string;
    };

    if (data.status !== "OK" || !data.result) throw new Error(data.error_message || "Google Places API request failed");

    return { name: data.result.name, rating: data.result.rating, reviews: data.result.reviews ?? [] };
  }

  makeExternalRef(placeId: string, review: GoogleReview) {
    const base = `${placeId}|${review.author_name ?? "anonymous"}|${review.time ?? "0"}|${review.text ?? ""}`;
    return crypto.createHash("sha256").update(base).digest("hex");
  }
}

export const googleService = new GoogleService();