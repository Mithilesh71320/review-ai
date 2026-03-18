import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/reviews(.*)",
  "/alerts(.*)",
  "/settings(.*)",
  "/api/settings(.*)",
  "/api/dashboard(.*)",
  "/api/reviews(.*)",
  "/api/alerts(.*)",
  "/api/insights(.*)",
  "/api/fetch-reviews(.*)",
  "/api/google(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
