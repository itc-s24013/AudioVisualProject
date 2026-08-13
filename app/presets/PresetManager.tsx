"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { deleteCurrentAccount, getCurrentAccountInfo, signOut } from "../login/actions";
import { deletePresetFromSupabase, loadPresetsFromSupabase, savePresetToSupabase, setDefaultPresetInSupabase, updatePresetInSupabase } from "./actions";
import { useAudioFile } from "@/app/context/AudioFileProvider";
import { useDesignSettings } from "@/app/context/DesignSettingProvider";

interface PresetItem {
  id: string;
  name: string;
  lineColor: string;
  lineWidth: number;
  graphType: string;
  sensitivity: number;
  effectType: string;
  isDefault: boolean;
  createdAt: string;
}

const STORAGE_KEY = "audio-visualizer-presets";

const initialForm = {
  name: "",
  lineColor: "#3f3f46",
  lineWidth: 4,
  graphType: "bars",
  sensitivity: 0.7,
  effectType: "lens",
};

const previewValues = [24, 52, 37, 67, 44, 72];

function DesignPreview({
  lineColor,
  lineWidth,
  graphType,
  effectType,
}: Pick<PresetItem, "lineColor" | "lineWidth" | "graphType" | "effectType">) {
  const barGap = Math.max(2, 14 - lineWidth);
  const isGlow = effectType === "glow";
  const previewFilter = isGlow ? "blur(4px)" : undefined;
  const elementFilter = isGlow
    ? `drop-shadow(0 0 12px ${lineColor}) drop-shadow(0 0 24px ${lineColor}80)`
    : effectType === "none"
      ? undefined
      : `drop-shadow(0 2px 4px ${lineColor}40)`;

  if (graphType === "line") {
    const points = previewValues
      .map((value, index) => {
        const x = (index / (previewValues.length - 1)) * 100;
        return `${x},${100 - value}`;
      })
      .join(" ");

    return (
      <svg
        className="h-full w-full overflow-visible"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-label="ラインのプレビュー"
        style={{ filter: previewFilter }}
      >
        <polyline
          points={points}
          fill="none"
          stroke={lineColor}
          strokeWidth={lineWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  return (
    <svg
      className="h-full w-full overflow-visible"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-label={graphType === "stack" ? "スタックのプレビュー" : "バーのプレビュー"}
      style={{ filter: previewFilter }}
    >
      {graphType === "stack" ? <line x1="0" y1="50" x2="100" y2="50" stroke="#94a3b8" strokeWidth="1" /> : null}
      {previewValues.map((value, index) => {
        const x = 4 + index * 16.2 + barGap / 10;
        const width = 12 - barGap / 5;

        if (graphType === "stack") {
          const halfHeight = value / 2;
          return (
            <g key={index} style={{ filter: previewFilter }}>
              <rect
                x={x}
                y={50 - halfHeight}
                width={width}
                height={halfHeight}
                fill={lineColor}
                style={{ filter: elementFilter }}
              />
              <rect
                x={x}
                y="50"
                width={width}
                height={halfHeight}
                fill={lineColor}
                opacity="0.65"
                style={{ filter: elementFilter }}
              />
            </g>
          );
        }

        return (
          <rect
            key={index}
            x={x}
            y={100 - value}
            width={width}
            height={value}
            fill={lineColor}
            style={{ filter: elementFilter }}
          />
        );
      })}
    </svg>
  );
}

export default function PresetManager() {
  const [presets, setPresets] = useState<PresetItem[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [audioName, setAudioName] = useState("サンプル音声");
  const { audioFile, setAudioFile } = useAudioFile();
  const { setDesignSettings } = useDesignSettings();
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [accountName, setAccountName] = useState("読み込み中...");
  const [accountEmail, setAccountEmail] = useState("");
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  };

  const closeToast = () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(null);
  };

  // 指定したプリセットのデザインを、/play での描画に使うContextへ反映する。
  // silent: true の場合はトーストを出さない(初期表示時の自動選択などで使用)。
  const applyDesign = (preset: PresetItem, options?: { silent?: boolean }) => {
    setDesignSettings({
      lineColor: preset.lineColor,
      lineWidth: preset.lineWidth,
      graphType: preset.graphType,
      sensitivity: preset.sensitivity,
      effectType: preset.effectType,
    });
    setSelectedPresetId(preset.id);
    if (!options?.silent) {
      showToast(`${preset.name} のデザインを再生に反映しました。`);
    }
  };

  const handleSelectDesign = (preset: PresetItem) => {
    applyDesign(preset);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasLoaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  }, [hasLoaded, presets]);

  useEffect(() => {
    void (async () => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as PresetItem[];
            if (parsed.length > 0) {
              setPresets(parsed.map((preset) => ({ ...preset, isDefault: Boolean(preset.isDefault) })));
            }
          } catch {
            // 何もしない
          }
        }

        const remotePresets = await loadPresetsFromSupabase();
        setPresets(remotePresets);

        // デフォルト設定のプリセットがあれば、初期表示時点でそのデザインを
        // 再生用Contextに反映しておく(何も選択しないまま/playへ行っても反映されるように)
        const defaultPreset = remotePresets.find((preset) => preset.isDefault);
        if (defaultPreset) {
          applyDesign(defaultPreset, { silent: true });
        }
      } catch (error) {
        const text = error instanceof Error ? error.message : "読み込みに失敗しました。";
        showToast(text);
      } finally {
        setHasLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const account = await getCurrentAccountInfo();
        setAccountName(account.name);
        setAccountEmail(account.email);
      } catch {
        setAccountName("アカウント");
        setAccountEmail("");
      }
    })();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!form.name.trim()) {
      showToast("プリセット名を入力してください。");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        id: editingId ?? undefined,
        name: form.name.trim(),
        lineColor: form.lineColor,
        lineWidth: Number(form.lineWidth),
        graphType: form.graphType,
        sensitivity: Number(form.sensitivity),
        effectType: form.effectType,
      };

      const nextPreset = editingId
        ? await updatePresetInSupabase(payload)
        : await savePresetToSupabase(payload);

      setPresets((current) => {
        if (editingId) {
          return current.map((preset) => (preset.id === editingId ? nextPreset : preset));
        }
        return [nextPreset, ...current];
      });

      showToast(editingId ? `${nextPreset.name} を更新しました。` : `${nextPreset.name} を保存しました。`);
      setForm(initialForm);
      setEditingId(null);
    } catch (error) {
      const text = error instanceof Error ? error.message : "保存に失敗しました。";
      showToast(text);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (preset: PresetItem) => {
    setForm({
      name: preset.name,
      lineColor: preset.lineColor,
      lineWidth: preset.lineWidth,
      graphType: preset.graphType,
      sensitivity: preset.sensitivity,
      effectType: preset.effectType,
    });
    setEditingId(preset.id);
    showToast(`${preset.name} を編集中です。`);
  };

  const handleDelete = async (id: string) => {
    const target = presets.find((preset) => preset.id === id);

    if (target?.isDefault) {
      showToast("デフォルト設定のプリセットは削除できません。");
      return;
    }

    try {
      await deletePresetFromSupabase(id);
      setPresets((current) => current.filter((preset) => preset.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setForm(initialForm);
      }
      if (selectedPresetId === id) {
        setSelectedPresetId(null);
      }
      showToast(target ? `${target.name} を削除しました。` : "プリセットを削除しました。");
    } catch (error) {
      const text = error instanceof Error ? error.message : "削除に失敗しました。";
      showToast(text);
    }
  };

  const handlePinPreset = async (id: string) => {
    try {
      const pinnedPreset = await setDefaultPresetInSupabase(id);
      setPresets((current) =>
        current.map((preset) => ({
          ...preset,
          isDefault: preset.id === pinnedPreset.id,
        }))
      );
      // デフォルトにしたプリセットのデザインを、そのまま再生用にも反映する
      applyDesign(pinnedPreset, { silent: true });
      showToast(`${pinnedPreset.name} をデフォルトに設定しました。`);
    } catch (error) {
      const text = error instanceof Error ? error.message : "デフォルト設定に失敗しました。";
      showToast(text);
    }
  };

  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isAudioType = file.type.startsWith("audio/");
    const isAudioExtension = /\.(mp3|wav|m4a|aac|ogg|flac|wma|opus|aiff|alac)$/i.test(file.name);

    if (!isAudioType && !isAudioExtension) {
      event.target.value = "";
      alert("音声ファイルをアップロードしてください");
      showToast("音声ファイルをアップロードしてください");
      return;
    }

    // URLではなくFileオブジェクトそのものを共有Contextに保存する。
    // /play 側はこのFileから、自分のページの寿命に合わせてobject URLを作る。
    setAudioFile(file);
    setAudioName(file.name);
    showToast(`${file.name} を音声ソースとして設定しました。`);
  };

  useEffect(() => {
    // 音声Fileの管理・破棄は AudioFileProvider / /play 側が行うため、
    // ここではトーストのタイマーだけ後片付けする。
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 relative">
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl animate-in fade-in slide-in-from-top-2">
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={closeToast}
            className="ml-2 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            aria-label="閉じる"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <main className="flex w-full flex-col gap-8 px-6 py-10 lg:px-8 lg:pr-[30rem]">
        <div className="flex justify-center w-full">
          <div className="w-64 h-64 flex flex-col justify-between rounded-none border border-slate-200 bg-white p-5 text-left shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">音声ソース</p>
              <p className="mt-1.5 text-sm font-semibold text-slate-900 truncate">{audioName}</p>
            </div>
            <div className="flex flex-col gap-2.5">
              <label className="flex cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 shadow-sm">
                <span>音声ファイルを選択</span>
                <input type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac" onChange={handleAudioUpload} className="hidden" />
              </label>
              {audioFile ? (
                <Link
                  href="/play"
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-center text-sm font-medium text-white transition hover:bg-slate-800 shadow-sm"
                >
                  再生画面へ開く
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  title="先に音声ファイルを選択してください"
                  className="cursor-not-allowed rounded-xl bg-slate-300 px-4 py-2.5 text-center text-sm font-medium text-white shadow-sm"
                >
                  再生画面へ開く
                </button>
              )}
            </div>
          </div>
        </div>

        <section className="space-y-8">
          <div className="rounded-none border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-semibold text-slate-900">保存済みプリセット</h2>
              <span className="rounded-none bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {!hasLoaded ? "..." : `${presets.length}件`}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 items-start">
              {!hasLoaded ? (
                <div className="flex w-full items-center justify-center rounded-none border border-dashed border-slate-200 p-8 text-sm text-slate-500 gap-2">
                  <svg className="animate-spin h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>プリセットを読み込み中...</span>
                </div>
              ) : presets.length === 0 ? (
                <p className="w-full rounded-none border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                  まだプリセットはありません。最初の1つを保存してください。
                </p>
              ) : (
                presets.map((preset) => {
                  const isSelected = preset.id === selectedPresetId;
                  return (
                    <article
                      key={preset.id}
                      onClick={() => handleSelectDesign(preset)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleSelectDesign(preset);
                        }
                      }}
                      title="クリックしてこのデザインを再生に反映"
                      className={`flex h-[12rem] w-[17rem] flex-none cursor-pointer flex-col rounded-none p-4 shadow-sm transition ${
                        isSelected
                          ? "border-2 border-indigo-500 bg-indigo-50/40 hover:border-indigo-500"
                          : preset.isDefault
                            ? "border-2 border-slate-900 bg-white hover:border-slate-900"
                            : "border border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-slate-900">{preset.name}</h3>
                          <p className="mt-1 text-xs text-slate-400">{new Date(preset.createdAt).toLocaleString("ja-JP")}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {isSelected ? (
                              <span className="inline-flex rounded-full border-2 border-indigo-500 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-indigo-600">
                                再生に使用中
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handlePinPreset(preset.id);
                            }}
                            className={`rounded-lg px-2.5 py-2 text-xs font-medium transition ${preset.isDefault ? "border-2 border-slate-900 bg-white text-slate-900 hover:bg-slate-100" : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
                            aria-label={preset.isDefault ? `${preset.name} はデフォルト設定済み` : `${preset.name} をデフォルトに設定`}
                            title={preset.isDefault ? "デフォルト設定済み" : "デフォルトに設定"}
                          >
                            📌
                          </button>
                          <div className="h-6 w-6 rounded-none border border-slate-200 shadow-inner" style={{ backgroundColor: preset.lineColor }} />
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                        <span className="rounded-none bg-white border border-slate-200 px-2.5 py-1">線{preset.lineWidth}px</span>
                        <span className="rounded-none bg-white border border-slate-200 px-2.5 py-1">{preset.graphType}</span>
                        <span className="rounded-none bg-white border border-slate-200 px-2.5 py-1">{preset.effectType}</span>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEdit(preset);
                          }}
                          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 shadow-sm"
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDelete(preset.id);
                          }}
                          disabled={preset.isDefault}
                          className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm transition ${preset.isDefault ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400" : "border border-rose-200 bg-rose-50/50 text-rose-600 hover:bg-rose-100/70"}`}
                          title={preset.isDefault ? "デフォルト設定のプリセットは削除できません" : "削除"}
                        >
                          削除
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </main>

      <aside className="mt-8 w-full px-6 pb-10 lg:px-8 lg:pr-[30rem]">
        <div className="rounded-none border border-slate-200 bg-white p-6 shadow-sm lg:fixed lg:right-6 lg:top-6 lg:bottom-6 lg:z-30 lg:w-[26rem] lg:overflow-y-auto lg:shadow-xl lg:shadow-slate-200/70">
          <div className="border-b border-slate-100 pb-4">
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">アカウント</p>
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen((current) => !current)}
                  className="mt-1 flex items-center gap-2 text-left text-lg font-semibold text-slate-900 transition hover:text-slate-700"
                >
                  <span className="max-w-[14rem] truncate">{accountName}</span>
                  <span className="text-sm text-slate-400">▾</span>
                </button>
                {accountEmail ? <p className="mt-1 text-xs text-slate-500">{accountEmail}</p> : null}
              </div>
              {editingId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(initialForm);
                    showToast("新規作成モードに戻りました。");
                  }}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  キャンセル
                </button>
              ) : null}
            </div>

            {isAccountMenuOpen ? (
              <div className="mt-3 w-full rounded-none border border-slate-200 bg-slate-50 p-2 shadow-sm">
                <form>
                  <button
                    type="submit"
                    formAction={signOut}
                    className="w-full rounded-none px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-white hover:text-slate-900"
                    onClick={() => {
                      window.localStorage.removeItem(STORAGE_KEY);
                    }}
                  >
                    ログアウト
                  </button>
                </form>
                <form>
                  <button
                    type="submit"
                    formAction={deleteCurrentAccount}
                    className="mt-1 w-full rounded-none px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
                    onClick={(event) => {
                      if (!window.confirm("アカウントを削除すると元に戻せません。続行しますか？")) {
                        event.preventDefault();
                        return;
                      }
                      window.localStorage.removeItem(STORAGE_KEY);
                    }}
                  >
                    アカウント削除
                  </button>
                </form>
              </div>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col">
            <div className="space-y-5">
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">デザインパネル</h2>
              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-2 block">プリセット名</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-none border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:bg-white focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  placeholder="例: 夜の波形"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-2 block">ラインカラー</span>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.lineColor}
                    onChange={(event) => setForm((current) => ({ ...current, lineColor: event.target.value }))}
                    className="h-12 w-20 cursor-pointer rounded-none border border-slate-200 bg-slate-50 p-1.5"
                  />
                  <input
                    type="text"
                    value={form.lineColor}
                    onChange={(event) => setForm((current) => ({ ...current, lineColor: event.target.value }))}
                    className="flex-1 rounded-none border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm uppercase text-slate-900 outline-none transition focus:bg-white focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  <span className="mb-2 block">線の太さ</span>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={form.lineWidth}
                    onChange={(event) => setForm((current) => ({ ...current, lineWidth: Number(event.target.value) }))}
                    className="w-full rounded-none border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:bg-white focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  <span className="mb-2 block">感度</span>
                  <input
                    type="range"
                    min="0.2"
                    max="1"
                    step="0.1"
                    value={form.sensitivity}
                    onChange={(event) => setForm((current) => ({ ...current, sensitivity: Number(event.target.value) }))}
                    className="mt-3 w-full accent-slate-900"
                  />
                  <div className="mt-1 text-xs text-slate-500">{form.sensitivity.toFixed(1)}</div>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  <span className="mb-2 block">グラフタイプ</span>
                  <select
                    value={form.graphType}
                    onChange={(event) => setForm((current) => ({ ...current, graphType: event.target.value }))}
                    className="w-full rounded-none border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:bg-white focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="bars">バー</option>
                    <option value="line">ライン</option>
                    <option value="stack">スタック</option>
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  <span className="mb-2 block">エフェクト</span>
                  <select
                    value={form.effectType}
                    onChange={(event) => setForm((current) => ({ ...current, effectType: event.target.value }))}
                    className="w-full rounded-none border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:bg-white focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="lens">レンズ</option>
                    <option value="glow">グロー</option>
                    <option value="none">なし</option>
                  </select>
                </label>
              </div>

              <div className="pt-2">
                <span className="mb-2 block text-sm font-medium text-slate-700">デザインプレビュー</span>
                <div className="rounded-none border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <span>リアルタイムプレビュー</span>
                    <span>{form.graphType} / {form.effectType}</span>
                  </div>
                  <div className="mt-3 flex h-28 items-end gap-2 rounded-none border border-slate-200/60 bg-slate-100 p-4">
                    <DesignPreview
                      lineColor={form.lineColor}
                      lineWidth={form.lineWidth}
                      graphType={form.graphType}
                      effectType={form.effectType}
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 shadow-sm"
            >
              {isSaving ? "保存中..." : editingId ? "更新する" : "保存する"}
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}
