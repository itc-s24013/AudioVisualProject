"use client";

// context/AudioFileProvider.tsx
//
// /presets でアップロードした音声ファイル(File実体)を /play まで
// そのまま引き継ぐためのContext。
//
// URL(blob:...)をクエリパラメータで渡す方式は、
// 「アップロード元のページがアンマウントされる」「ページを直接開き直す」
// 「別タブで開く」などのタイミングでURLが失効し再生できなくなる問題があった。
// そのためURLではなくFileオブジェクトそのものをアプリ全体で共有し、
// /play 側が自分のページの寿命に合わせて安全にobject URLを作る方式にする。

import { createContext, useContext, useState, type ReactNode } from "react";

interface AudioFileContextValue {
  audioFile: File | null;
  setAudioFile: (file: File | null) => void;
}

const AudioFileContext = createContext<AudioFileContextValue | null>(null);

export function AudioFileProvider({ children }: { children: ReactNode }) {
  const [audioFile, setAudioFile] = useState<File | null>(null);

  return (
    <AudioFileContext.Provider value={{ audioFile, setAudioFile }}>
      {children}
    </AudioFileContext.Provider>
  );
}

export function useAudioFile() {
  const ctx = useContext(AudioFileContext);
  if (!ctx) {
    throw new Error("useAudioFile は AudioFileProvider の内側でのみ使用できます");
  }
  return ctx;
}