"use client";

// context/DesignSettingsProvider.tsx
//
// /presets で選択した(保存済みプリセットの)デザイン設定を、
// /play での描画に反映するためのContext。
//
// AudioFileProvider と同じ考え方: URLではなく値そのものをアプリ全体で共有し、
// /play 側はマウント時にContextから現在の値を読み取って描画に使う。

import { createContext, useContext, useState, type ReactNode } from "react";

export interface DesignSettings {
  lineColor: string;
  lineWidth: number;
  graphType: string;
  sensitivity: number;
  effectType: string;
}

// PresetManager.tsx の initialForm と揃えたデフォルト値
export const DEFAULT_DESIGN_SETTINGS: DesignSettings = {
  lineColor: "#3f3f46",
  lineWidth: 4,
  graphType: "bars",
  sensitivity: 0.7,
  effectType: "lens",
};

interface DesignSettingsContextValue {
  designSettings: DesignSettings;
  setDesignSettings: (settings: DesignSettings) => void;
}

const DesignSettingsContext =
  createContext<DesignSettingsContextValue | null>(null);

export function DesignSettingsProvider({ children }: { children: ReactNode }) {
  const [designSettings, setDesignSettings] = useState<DesignSettings>(
    DEFAULT_DESIGN_SETTINGS
  );

  return (
    <DesignSettingsContext.Provider
      value={{ designSettings, setDesignSettings }}
    >
      {children}
    </DesignSettingsContext.Provider>
  );
}

export function useDesignSettings() {
  const ctx = useContext(DesignSettingsContext);
  if (!ctx) {
    throw new Error(
      "useDesignSettings は DesignSettingsProvider の内側でのみ使用できます"
    );
  }
  return ctx;
}