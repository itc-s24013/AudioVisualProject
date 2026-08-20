"use client";

import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

// const PRODUCTION_ORIGIN = "https://audio-visual-project-chi.vercel.app";
const PRODUCTION_ORIGIN = "https://audio-visual-project-git-s24013-s24013s-projects.vercel.app";

export default function LoginPage() {
  const [errorMessage, setErrorMessage] = useState("");
  const hasStartedAutoSignIn = useRef(false);

  const signInWithGoogle = useCallback(async () => {
    // Vercel のプレビュー URL で開始した OAuth は、本番 URL の callback と
    // Cookie を共有できない。認証開始前に本番ホストへそろえる。
    if (
      window.location.hostname.endsWith(".vercel.app") &&
      window.location.origin !== PRODUCTION_ORIGIN
    ) {
      window.location.assign(`${PRODUCTION_ORIGIN}/login?autoSignIn=1`);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErrorMessage("ログインを開始できませんでした。時間をおいて再試行してください。");
      return;
    }

    if (data.url) {
      window.location.assign(data.url);
    }
  }, []);

  useEffect(() => {
    if (
      hasStartedAutoSignIn.current ||
      new URLSearchParams(window.location.search).get("autoSignIn") !== "1"
    ) {
      return;
    }

    hasStartedAutoSignIn.current = true;
    window.history.replaceState(null, "", "/login");
    void signInWithGoogle();
  }, [signInWithGoogle]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <button
        type="button"
        onClick={signInWithGoogle}
        aria-label="Google でログイン"
      >
        <Image src="/google_icon.png" alt="" width={540} height={120} />
      </button>
      {errorMessage && <p role="alert">{errorMessage}</p>}
    </main>
  );
}
