"use client";

import { useEffect, useRef } from "react";

type Props = {
  audio: HTMLAudioElement | null;
};

export default function Visualizer({
  audio,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!audio) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const audioContext = new AudioContext();

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;

    const source = audioContext.createMediaElementSource(audio);

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      requestAnimationFrame(render);

      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#18181b";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / bufferLength;

      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i];
        const height = (value / 255) * canvas.height;

        ctx.fillStyle = "#3b82f6";

        ctx.fillRect(
          i * barWidth,
          canvas.height - height,
          barWidth - 2,
          height
        );
      }
    };

    audioContext.resume();

    render();

    return () => {
      audioContext.close();
    };
  }, [audio]);

  return (
    <canvas
      ref={canvasRef}
      width={900}
      height={300}
      className="w-full rounded-xl border border-zinc-700 bg-black"
    />
  );
}