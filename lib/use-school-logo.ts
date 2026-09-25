"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "./supabase";
import { schoolLogoBucket } from "./school-logo";

type LogoResult = { userId: string; path: string; url?: string; error?: string };

export function useSchoolLogo(userId: string | undefined, path: string) {
  const [result, setResult] = useState<LogoResult | null>(null);

  useEffect(() => {
    if (!userId || !path) return;
    let active = true;
    void (async () => {
      try {
        const { data, error } = await getSupabase().storage.from(schoolLogoBucket).download(path);
        if (error) throw error;
        if (!active) return;
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(data);
        });
        if (!active) return;
        setResult({ userId, path, url: dataUrl });
      } catch {
        if (active) setResult({ userId, path, error: "Could not load the school logo. Replace it in Settings or check that the Storage migration is applied." });
      }
    })();
    return () => { active = false; };
  }, [userId, path]);

  return result && result.userId === userId && result.path === path
    ? { logoUrl: result.url ?? null, logoError: result.error ?? null }
    : { logoUrl: null, logoError: null };
}
