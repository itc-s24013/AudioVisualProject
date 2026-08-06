"use client";

type Props = {
  fileName: string;
};

export default function NowPlaying({
  fileName,
}: Props) {
  return (
    <div className="w-full rounded-lg bg-zinc-700 p-4">
      <h2 className="mb-2 text-lg font-semibold text-white">
        再生中の楽曲
      </h2>

      <p className="truncate text-zinc-300">
        {fileName || "ファイルが選択されていません"}
      </p>
    </div>
  );
}