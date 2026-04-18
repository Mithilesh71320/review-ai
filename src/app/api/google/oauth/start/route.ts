import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const scopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/business.manage",
];

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      {
        error:
          "Missing GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_REDIRECT_URI configuration.",
      },
      { status: 500 },
    );
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("scope", scopes.join(" "));

  return NextResponse.json({ authUrl: url.toString() });
}
