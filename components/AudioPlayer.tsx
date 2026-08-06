"use client";

import { useEffect, useRef, useState } from "react";
import AudioUploader from "./AudioUploader";
import AudioControls from "./AudioControls";
import ProgressBar from "./ProgressBar";
import NowPlaying from "./NowPlaying";
import Visualizer from "./Visualizer";
import DesignPanel from "./DesignPanel";

export default function AudioPlayer() {

  const audioRef = useRef<HTMLAudioElement | null>(null);


  const [audioElement, setAudioElement] =
    useState<HTMLAudioElement | null>(null);


  const [fileName, setFileName] =
    useState("");


  const [currentTime, setCurrentTime] =
    useState(0);


  const [duration, setDuration] =
    useState(0);



  // ビジュアライザー設定
  const [lineColor, setLineColor] =
    useState("#3b82f6");


  const [lineWidth, setLineWidth] =
    useState(4);


  const [fftSize, setFftSize] =
    useState(512);




  // LocalStorageから設定を復元
  useEffect(() => {

    const savedSettings =
      localStorage.getItem(
        "visualizerSettings"
      );


    if (savedSettings) {

      const settings =
        JSON.parse(savedSettings);


      if (settings.lineColor) {
        setLineColor(
          settings.lineColor
        );
      }


      if (settings.lineWidth) {
        setLineWidth(
          settings.lineWidth
        );
      }


      if (settings.fftSize) {
        setFftSize(
          settings.fftSize
        );
      }

    }

  }, []);




  // 設定変更時に保存
  useEffect(() => {

    const settings = {
      lineColor,
      lineWidth,
      fftSize
    };


    localStorage.setItem(
      "visualizerSettings",
      JSON.stringify(settings)
    );


  }, [
    lineColor,
    lineWidth,
    fftSize
  ]);




  const handleFileChange = (file: File) => {

    const url =
      URL.createObjectURL(file);


    setFileName(
      file.name
    );


    if (audioRef.current) {

      audioRef.current.src = url;

      setAudioElement(
        audioRef.current
      );

    }

  };




  const playAudio = () => {

    audioRef.current?.play();

  };




  const stopAudio = () => {

    if (audioRef.current) {

      audioRef.current.pause();

      audioRef.current.currentTime = 0;

      setCurrentTime(0);

    }

  };




  const seekAudio = (time: number) => {

    if (audioRef.current) {

      audioRef.current.currentTime =
        time;


      setCurrentTime(
        time
      );

    }

  };




  return (

    <div className="flex w-full max-w-4xl flex-col gap-8 rounded-xl bg-zinc-800 p-8 shadow-lg">


      <Visualizer
        audio={audioElement}
        lineColor={lineColor}
        lineWidth={lineWidth}
        fftSize={fftSize}
      />



      <DesignPanel
        lineColor={lineColor}
        setLineColor={setLineColor}

        lineWidth={lineWidth}
        setLineWidth={setLineWidth}

        fftSize={fftSize}
        setFftSize={setFftSize}
      />



      <NowPlaying
        fileName={fileName}
      />



      <ProgressBar
        currentTime={currentTime}
        duration={duration}
        onSeek={seekAudio}
      />



      <AudioUploader
        onFileSelect={handleFileChange}
      />



      <AudioControls
        onPlay={playAudio}
        onStop={stopAudio}
      />



      <audio

        ref={audioRef}

        controls


        onTimeUpdate={() => {

          if (audioRef.current) {

            setCurrentTime(
              audioRef.current.currentTime
            );

          }

        }}


        onLoadedMetadata={() => {

          if (audioRef.current) {

            setDuration(
              audioRef.current.duration
            );

          }

        }}

      />


    </div>

  );

}