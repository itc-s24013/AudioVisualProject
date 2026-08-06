"use client";

import { useRef, useState } from "react";

type Props = {
  onFileSelect: (file: File) => void;
};

export default function AudioUploader({
  onFileSelect,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState(
    "まだファイルが選択されていません"
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setFileName(file.name);
    onFileSelect(file);
  };

  return (
    <div className="w-full">
      <label className="mb-2 block text-lg font-semibold text-white">
        音楽ファイル
      </label>

      <div
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer rounded-xl border-2 border-dashed border-blue-500 bg-zinc-700 p-8 text-center transition hover:bg-zinc-600"
      >
        <div className="mb-2 text-4xl">🎵</div>

        <p className="text-lg font-semibold text-white">
          クリックして音楽ファイルを選択
        </p>

        <p className="mt-3 text-sm text-zinc-300">
          {fileName}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}