import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");

  let next = searchParams.get("next") ?? "/";

  if (!next.startsWith("/")) {
    next = "/";
  }

  console.log("===== Auth Callback =====");
  console.log("code:", code ? "あり" : "なし");

  if (code) {
    const supabase = await createClient();

    const { error } =
      await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("===== Supabase Auth Error =====");
      console.error("message:", error.message);
      console.error("status:", error.status);
      console.error("name:", error.name);
      console.error("================================");
    } else {
      console.log("===== Login Success =====");

      const forwardedHost =
        request.headers.get("x-forwarded-host");

      const isLocalEnv =
        process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(
          `https://${forwardedHost}${next}`
        );
      } else {
        return NextResponse.redirect(
          `${origin}${next}`
        );
      }
    }
  } else {
    console.error("Auth callbackにcodeがありません");
  }

  return NextResponse.redirect(
    `${origin}/auth/auth-code-error`
  );
}