"use client";

import { useEffect, useRef } from "react";


type Props = {
  audio: HTMLAudioElement | null;

  lineColor: string;

  lineWidth: number;

  fftSize: number;
};


export default function Visualizer({
  audio,
  lineColor,
  lineWidth,
  fftSize,

}: Props) {


  const canvasRef =
    useRef<HTMLCanvasElement | null>(null);


  const analyserRef =
    useRef<AnalyserNode | null>(null);


  const lineColorRef =
    useRef(lineColor);


  const lineWidthRef =
    useRef(lineWidth);



  // 色・太さの最新値を保持
  useEffect(() => {

    lineColorRef.current =
      lineColor;


    lineWidthRef.current =
      lineWidth;


  }, [
    lineColor,
    lineWidth
  ]);




  // FFT変更
  useEffect(() => {

    if (analyserRef.current) {

      analyserRef.current.fftSize =
        fftSize;

    }

  }, [
    fftSize
  ]);




  // 音声接続
  useEffect(() => {


    if (!audio) return;



    const canvas =
      canvasRef.current;


    if (!canvas) return;



    const ctx =
      canvas.getContext("2d");


    if (!ctx) return;




    const audioContext =
      new AudioContext();



    const analyser =
      audioContext.createAnalyser();



    analyser.fftSize =
      fftSize;



    analyserRef.current =
      analyser;




    const source =
      audioContext.createMediaElementSource(
        audio
      );



    source.connect(
      analyser
    );


    analyser.connect(
      audioContext.destination
    );



    const bufferLength =
      analyser.frequencyBinCount;



    const dataArray =
      new Uint8Array(
        bufferLength
      );



    let animationId: number;




    const draw = () => {


      animationId =
        requestAnimationFrame(
          draw
        );



      analyser.getByteFrequencyData(
        dataArray
      );



      // 背景
      ctx.fillStyle =
        "#000000";


      ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );



      const barWidth =
        canvas.width /
        bufferLength;



      for (
        let i = 0;
        i < bufferLength;
        i++
      ) {


        const value =
          dataArray[i];



        const barHeight =
          (value / 255) *
          canvas.height;



        // 設定した色
        ctx.fillStyle =
          lineColorRef.current;



        ctx.fillRect(

          i * barWidth,

          canvas.height - barHeight,

          lineWidthRef.current,

          barHeight

        );


      }

    };



    draw();




    return () => {


      cancelAnimationFrame(
        animationId
      );


      source.disconnect();


      analyser.disconnect();


      audioContext.close();


      analyserRef.current =
        null;


    };



  }, [
    audio
  ]);





  return (

    <canvas

      ref={canvasRef}

      width={1000}

      height={350}

      className="w-full rounded-xl border border-zinc-700 bg-black"

    />

  );

}