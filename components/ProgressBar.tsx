"use client";

type Props = {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
};

function formatTime(time: number) {
  if (isNaN(time)) return "0:00";

  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function ProgressBar({
  currentTime,
  duration,
  onSeek,
}: Props) {
  return (
    <div className="w-full">

      <div className="mb-2 flex justify-between text-sm text-white">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      <input
        type="range"
        min={0}
        max={duration || 0}
        value={currentTime}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="w-full"
      />

    </div>
  );
}