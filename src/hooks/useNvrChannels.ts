/**
 * kuzatuv posti kanallari → Kameralar sahifasi uchun kamera ro'yxati.
 *
 * NEGA kerak: asosiy backend'da (`/api/v1/cameras`) kamera ro'yxati BO'SH,
 * qurilmada esa 32 ta kanal ro'yxatga olingan. Shuning uchun sahifa backend
 * bo'sh bo'lsa shu ro'yxatga tushadi — xuddi `useMockPeople` kabi.
 *
 * Kanal `CameraOut` shakliga o'giriladi, ya'ni Kameralar sahifasining butun
 * mavjud UI'si O'ZGARISHSIZ ishlaydi.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listChannels, type NvrChannel } from "@/lib/nvrApi";
import type { CameraOut } from "@/lib/api";

/** Kanal → backend `CameraOut` ko'rinishi. */
export function channelToCamera(c: NvrChannel): CameraOut {
  return {
    id: `nvr-ch-${c.id}`,
    name: c.name && c.name !== "Camera 01" ? `${c.name} (${c.id}-kanal)` : `${c.id}-kanal`,
    brand: "hikvision",
    location: null,
    ip_address: c.ip || null,
    port: 80,
    username: null,
    channel: c.id,
    stream_quality: "main",
    direction: "area",
    is_active: c.online,
    created_at: "",
    stream_url_masked: null,
  };
}

export function useNvrChannels() {
  const query = useQuery({
    queryKey: ["nvr-channels"],
    queryFn: listChannels,
    staleTime: 60_000,
    retry: false,
  });

  const channels = query.data;

  return useMemo(() => {
    const list = channels ?? [];
    return {
      channels: list,
      /** Kameralar sahifasi kutadigan shakl. */
      cameras: list.map(channelToCamera),
      online: list.filter((c) => c.online).length,
      total: list.length,
      isLoading: query.isLoading,
      error: query.error,
    };
  }, [channels, query.isLoading, query.error]);
}
