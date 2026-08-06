"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

const PRODUCTION_ORIGIN = "https://audio-visual-project-chi.vercel.app";

export default function LoginPage() {
  const [errorMessage, setErrorMessage] = useState("");

  async function signInWithGoogle() {
    // Vercel のプレビュー URL で開始した OAuth は、本番 URL の callback と
    // Cookie を共有できない。認証開始前に本番ホストへそろえる。
    if (
      window.location.hostname.endsWith(".vercel.app") &&
      window.location.origin !== PRODUCTION_ORIGIN
    ) {
      window.location.assign(`${PRODUCTION_ORIGIN}/login`);
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
  }

  return (
    <main>
      <button type="button" onClick={signInWithGoogle}>
        ログイン
      </button>
      {errorMessage && <p role="alert">{errorMessage}</p>}
    </main>
  );
}
