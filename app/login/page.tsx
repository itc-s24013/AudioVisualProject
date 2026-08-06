"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function LoginPage() {
  const [errorMessage, setErrorMessage] = useState("");

  async function signInWithGoogle() {
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
