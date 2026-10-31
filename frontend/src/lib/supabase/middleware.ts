import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "../env";

const GUEST_ONLY = ["/login", "/signup"];
const SECOND_FACTOR = "/login/two-factor";

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isApp = path.startsWith("/app") || path.startsWith("/admin");
  const redirect = (pathname: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    Object.entries(params ?? {}).forEach(([key, value]) => url.searchParams.set(key, value));
    return NextResponse.redirect(url);
  };

  if (!user) {
    if (isApp || path === SECOND_FACTOR || path === "/reset-password") {
      return redirect("/login", isApp ? { next: path } : undefined);
    }
    return response;
  }

  const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const pendingSecondFactor = assurance?.nextLevel === "aal2" && assurance.currentLevel !== "aal2";

  if (pendingSecondFactor && (isApp || GUEST_ONLY.includes(path))) {
    return redirect(SECOND_FACTOR, isApp ? { next: path } : undefined);
  }

  if (!pendingSecondFactor && (GUEST_ONLY.includes(path) || path === SECOND_FACTOR)) {
    return redirect("/app");
  }

  return response;
}
