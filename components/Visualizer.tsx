"use client";

import { useEffect, useRef } from "react";


type Props = {
  audio: HTMLAudioElement | null;
};


export default function Visualizer({
  audio,
}: Props) {

  const canvasRef =
    useRef<HTMLCanvasElement | null>(null);


  useEffect(() => {

    if (!audio) return;


    const canvas = canvasRef.current;

    if (!canvas) return;


    const ctx = canvas.getContext("2d");

    if (!ctx) return;


    const audioContext =
      new AudioContext();


    const analyser =
      audioContext.createAnalyser();


    const source =
      audioContext.createMediaElementSource(audio);


    source.connect(analyser);

    analyser.connect(
      audioContext.destination
    );


    analyser.fftSize = 256;


    const bufferLength =
      analyser.frequencyBinCount;


    const dataArray =
      new Uint8Array(bufferLength);


    const draw = () => {

      requestAnimationFrame(draw);


      analyser.getByteFrequencyData(
        dataArray
      );


      ctx.fillStyle = "black";

      ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );


      const barWidth =
        canvas.width / bufferLength;


      dataArray.forEach(
        (value, index) => {

          const barHeight =
            value;


          ctx.fillStyle =
            "white";


          ctx.fillRect(
            index * barWidth,
            canvas.height - barHeight,
            barWidth - 2,
            barHeight
          );

        }
      );
    };


    draw();


  }, [audio]);


  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={300}
      className="
        rounded-xl
        border
        border-zinc-700
        bg-black
      "
    />
  );
}