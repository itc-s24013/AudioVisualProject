"use client";


type Props = {
  onPlay: () => void;
  onStop: () => void;
};


export default function AudioControls({
  onPlay,
  onStop,
}: Props) {

  return (
    <div className="flex gap-4">

      <button
        onClick={onPlay}
        className="px-6 py-3 rounded-full bg-blue-600 text-white"
      >
        再生
      </button>


      <button
        onClick={onStop}
        className="px-6 py-3 rounded-full bg-zinc-700 text-white"
      >
        停止
      </button>

    </div>
  );
}