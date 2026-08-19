"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export interface PresetPayload {
  id?: string;
  name: string;
  backgroundColor: string;
  lineColor: string;
  lineWidth: number;
  graphType: string;
  sensitivity: number;
  effectType: string;
}

export interface PresetRecord {
  id: string;
  name: string;
  backgroundColor: string;
  lineColor: string;
  lineWidth: number;
  graphType: string;
  sensitivity: number;
  effectType: string;
  isDefault: boolean;
  createdAt: string;
}

async function getAuthedUserId() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("ログインが必要です。まずログインしてください。")
  }

  return data.user.id;
}

function formatPreset(preset: {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: Date;
  settings?: unknown;
  designSetting?: {
    lineColor?: string;
    lineWidth?: number;
    graphType?: string;
    sensitivity?: number;
    effectType?: string;
  } | null;
}): PresetRecord {
  const settings = (preset.settings as Record<string, unknown> | null) ?? {};
  const design = preset.designSetting;
  const hasBackgroundColor = typeof settings.backgroundColor === "string";

  return {
    id: preset.id,
    name: preset.name,
    // backgroundColor がない既存データでは、以前の lineColor を背景色として扱う。
    backgroundColor: String(settings.backgroundColor ?? design?.lineColor ?? settings.lineColor ?? "#dcf0f0"),
    lineColor: hasBackgroundColor
      ? String(design?.lineColor ?? settings.lineColor ?? "#ffffff")
      : "#ffffff",
    lineWidth: Number(design?.lineWidth ?? (settings.lineWidth as number | undefined) ?? 4),
    graphType: String(design?.graphType ?? (settings.graphType as string | undefined) ?? "bars"),
    sensitivity: Number(design?.sensitivity ?? (settings.sensitivity as number | undefined) ?? 0.7),
    effectType: String(design?.effectType ?? (settings.effectType as string | undefined) ?? "lens"),
    isDefault: preset.isDefault,
    createdAt: preset.createdAt.toISOString(),
  };
}

export async function loadPresetsFromSupabase(): Promise<PresetRecord[]> {
  const userId = await getAuthedUserId();

  const presets = await prisma.preset.findMany({
    where: {
      userId,
      isDeleted: false,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      designSetting: true,
    },
  });

  return presets.map(formatPreset);
}

export async function savePresetToSupabase(payload: PresetPayload): Promise<PresetRecord> {
  const userId = await getAuthedUserId();

  const preset = await prisma.preset.create({
    data: {
      userId,
      name: payload.name,
      isDefault: false,
      settings: {
        backgroundColor: payload.backgroundColor,
        lineColor: payload.lineColor,
        lineWidth: payload.lineWidth,
        graphType: payload.graphType,
        sensitivity: payload.sensitivity,
        effectType: payload.effectType,
      },
      designSetting: {
        create: {
          lineColor: payload.lineColor,
          lineWidth: payload.lineWidth,
          graphType: payload.graphType,
          sensitivity: payload.sensitivity,
          effectType: payload.effectType,
        },
      },
    },
    include: {
      designSetting: true,
    },
  });

  return formatPreset(preset);
}

export async function updatePresetInSupabase(payload: PresetPayload): Promise<PresetRecord> {
  if (!payload.id) {
    throw new Error("更新対象の ID がありません。")
  }

  const userId = await getAuthedUserId();

  const existingPreset = await prisma.preset.findFirst({
    where: {
      id: payload.id,
      userId,
      isDeleted: false,
    },
  });

  if (!existingPreset) {
    throw new Error("対象のプリセットが見つかりませんでした。")
  }

  const preset = await prisma.preset.update({
    where: {
      id: payload.id,
    },
    data: {
      name: payload.name,
      settings: {
        backgroundColor: payload.backgroundColor,
        lineColor: payload.lineColor,
        lineWidth: payload.lineWidth,
        graphType: payload.graphType,
        sensitivity: payload.sensitivity,
        effectType: payload.effectType,
      },
      designSetting: {
        upsert: {
          create: {
            lineColor: payload.lineColor,
            lineWidth: payload.lineWidth,
            graphType: payload.graphType,
            sensitivity: payload.sensitivity,
            effectType: payload.effectType,
          },
          update: {
            lineColor: payload.lineColor,
            lineWidth: payload.lineWidth,
            graphType: payload.graphType,
            sensitivity: payload.sensitivity,
            effectType: payload.effectType,
          },
        },
      },
    },
    include: {
      designSetting: true,
    },
  });

  return formatPreset(preset);
}

export async function deletePresetFromSupabase(id: string): Promise<void> {
  const userId = await getAuthedUserId();

  const targetPreset = await prisma.preset.findFirst({
    where: {
      id,
      userId,
      isDeleted: false,
    },
    select: {
      isDefault: true,
    },
  });

  if (!targetPreset) {
    return;
  }

  if (targetPreset.isDefault) {
    throw new Error("デフォルト設定のプリセットは削除できません。")
  }

  await prisma.preset.updateMany({
    where: {
      id,
      userId,
      isDeleted: false,
    },
    data: {
      isDeleted: true,
    },
  });
}

export async function setDefaultPresetInSupabase(id: string): Promise<PresetRecord> {
  const userId = await getAuthedUserId();

  const targetPreset = await prisma.preset.findFirst({
    where: {
      id,
      userId,
      isDeleted: false,
    },
  });

  if (!targetPreset) {
    throw new Error("対象のプリセットが見つかりませんでした。")
  }

  const preset = await prisma.$transaction(async (tx) => {
    await tx.preset.updateMany({
      where: {
        userId,
        isDeleted: false,
      },
      data: {
        isDefault: false,
      },
    });

    return tx.preset.update({
      where: {
        id,
      },
      data: {
        isDefault: true,
      },
      include: {
        designSetting: true,
      },
    });
  });

  return formatPreset(preset);
}
