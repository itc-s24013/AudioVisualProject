"use client";

import { useRef, useState } from "react";
import AudioUploader from "./AudioUploader";
import AudioControls from "./AudioControls";
import ProgressBar from "./ProgressBar";
import NowPlaying from "./NowPlaying";
// import Visualizer from "./Visualizer";

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

  const handleFileChange = (file: File) => {
    const url = URL.createObjectURL(file);

    setFileName(file.name);

    if (audioRef.current) {
      audioRef.current.src = url;
      setAudioElement(audioRef.current);
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
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  return (
    <div className="flex w-full max-w-4xl flex-col gap-8 rounded-xl bg-zinc-800 p-8 shadow-lg">

      {/* Visualizer */}
      {/* <Visualizer audio={audioElement} /> */}

      {/* 再生中の曲 */}
      <NowPlaying fileName={fileName} />

      {/* プログレスバー */}
      <ProgressBar
        currentTime={currentTime}
        duration={duration}
        onSeek={seekAudio}
      />

      {/* ファイル選択 */}
      <AudioUploader
        onFileSelect={handleFileChange}
      />

      {/* 再生・停止ボタン */}
      <AudioControls
        onPlay={playAudio}
        onStop={stopAudio}
      />

      <audio
        ref={audioRef}
        controls
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
          }
        }}
      />
    </div>
  );
}