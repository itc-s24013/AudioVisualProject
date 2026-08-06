"use client";

import { useState } from "react";

export default function DesignPanel() {
  const [color, setColor] = useState("#3b82f6");
  const [barWidth, setBarWidth] = useState(8);
  const [fftSize, setFftSize] = useState(256);

  const handleSave = () => {
    console.log("===== デザイン設定 =====");
    console.log("色:", color);
    console.log("バーの太さ:", barWidth);
    console.log("FFTサイズ:", fftSize);

    alert("設定を保存しました！");
  };

  return (
    <div className="w-full rounded-xl bg-zinc-800 p-6 shadow-lg">
      <h2 className="mb-6 text-2xl font-bold text-white">
        デザイン設定
      </h2>

      <div className="space-y-6">

        <div>
          <label className="mb-2 block text-white">
            ビジュアライザーの色
          </label>

          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-12 w-20 cursor-pointer rounded"
          />
        </div>

        <div>
          <label className="mb-2 block text-white">
            バーの太さ
          </label>

          <input
            type="range"
            min="2"
            max="20"
            value={barWidth}
            onChange={(e) =>
              setBarWidth(Number(e.target.value))
            }
            className="w-full"
          />

          <p className="mt-2 text-zinc-300">
            {barWidth}px
          </p>
        </div>

        <div>
          <label className="mb-2 block text-white">
            FFTサイズ
          </label>

          <select
            value={fftSize}
            onChange={(e) =>
              setFftSize(Number(e.target.value))
            }
            className="w-full rounded bg-zinc-700 p-2 text-white"
          >
            <option value={128}>128</option>
            <option value={256}>256</option>
            <option value={512}>512</option>
            <option value={1024}>1024</option>
            <option value={2048}>2048</option>
          </select>
        </div>

        <button
          onClick={handleSave}
          className="w-full rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
        >
          設定を保存
        </button>

      </div>
    </div>
  );
}