"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

export interface CurrentAccountInfo {
  id: string;
  name: string;
  email: string;
}

export async function signInWithGoogle() {
    const supabase = await createClient();
    const { data } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback',
        },
      })
      
      if (data.url) {
        redirect(data.url) // use the redirect API for your server framework
      }
}

export async function signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "global" });
    redirect('/login')
}

export async function getCurrentAccountInfo(): Promise<CurrentAccountInfo> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    throw new Error("アカウント情報を取得できませんでした。")
  }

  const user = data.user;
  const name = (user.user_metadata?.full_name || user.user_metadata?.name || user.email || user.id) as string;

  return {
    id: user.id,
    name,
    email: user.email ?? "",
  };
}

export async function deleteCurrentAccount() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    throw new Error("アカウントを削除できませんでした。")
  }

  const user = data.user;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("アカウント削除に必要な管理者キーが設定されていません。")
  }

  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  const presetIds = await prisma.preset.findMany({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
    },
  });

  await prisma.$transaction(async (tx) => {
    if (presetIds.length > 0) {
      await tx.designSetting.deleteMany({
        where: {
          presetId: {
            in: presetIds.map((preset) => preset.id),
          },
        },
      });

      await tx.preset.deleteMany({
        where: {
          userId: user.id,
        },
      });
    }

    await tx.user.deleteMany({
      where: {
        id: user.id,
      },
    });
  });

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

  if (deleteError) {
    throw new Error(deleteError.message || "アカウントの削除に失敗しました。")
  }

  await supabase.auth.signOut({ scope: "global" });

  redirect('/login')
}