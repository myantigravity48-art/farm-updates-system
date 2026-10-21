import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/next-path";
import { getSupabaseConfig, MissingSupabaseConfigError } from "@/lib/supabase/config";

const AUTH_PATHS = new Set(["/login", "/forgot-password"]);

type PendingCookie = { name: string; value: string; options: CookieOptions };

function withPendingAuth(
  response: NextResponse,
  cookies: PendingCookie[],
  headers: Record<string, string>,
) {
  for (const { name, value, options } of cookies) {
    response.cookies.set(name, value, options);
  }
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

/**
 * Refreshes the Supabase session cookies on every request and applies the
 * route rules:
 * - logged-out visitors are sent to /login?next=<path> (except auth pages)
 * - logged-in visitors who open /login are sent to /
 */
export async function proxy(request: NextRequest) {
  let config;
  try {
    config = getSupabaseConfig();
  } catch (error) {
    if (error instanceof MissingSupabaseConfigError) {
      return new NextResponse(error.message, {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8", "Cache-Control": "private, no-store" },
      });
    }
    throw error;
  }

  const pendingCookies: PendingCookie[] = [];
  const pendingHeaders: Record<string, string> = {};
  let response = NextResponse.next({ request });

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
          pendingCookies.push({ name, value, options });
        }
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
          pendingHeaders[key] = value;
        }
      },
    },
  });

  let signedIn = false;
  try {
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims?.sub);
  } catch {
    // If the auth server cannot be reached, let the server layout retry and
    // decide. The redirect below stays optimistic.
    signedIn = false;
  }

  const { pathname, search } = request.nextUrl;
  const { origin } = request.nextUrl;

  if (!signedIn && !AUTH_PATHS.has(pathname)) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("next", safeNextPath(`${pathname}${search}`));
    return withPendingAuth(NextResponse.redirect(loginUrl), pendingCookies, pendingHeaders);
  }

  if (signedIn && pathname === "/login") {
    return withPendingAuth(NextResponse.redirect(new URL("/", origin)), pendingCookies, pendingHeaders);
  }

  return withPendingAuth(response, pendingCookies, pendingHeaders);
}

export const config = {
  /*
   * Skip static assets, image optimisation and anything with a file extension
   * (including public/login-moss.jpg).
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
