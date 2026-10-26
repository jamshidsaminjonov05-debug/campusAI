/**
 * CHEKISH / TELEFON — serverda BITTA kategoriya (`smoking`), `/events/stats`
 * ajratmaydi. Davrdagi `smoking` hodisalari (`limit=500`, rasmsiz, yengil)
 * olinib, `isPhoneEvent()` bilan klientda ikkiga bo'linadi — "Aniqlanganlar"
 * tabi bilan AYNI qoida. Oyna to'lsa (`total > 500`) `capped` — sonlar
 * taxminiy ("+") ekani yashirilmaydi.
 *
 * Ilgari bu so'rov `DetectionsPage` ichida edi (2026-10-23); 2026-10-24 dan
 * Statistika → Umumiy ("Aniqlangan qoidabuzarliklar") ham shuni ko'rsatadi —
 * bitta kalit, bitta kesh.
 */
import { useQuery } from "@tanstack/react-query";
import { NVR_MAX_LIMIT, isPhoneEvent, listEvents, liveInterval } from "@/lib/nvr/nvrApi";

export interface SmokingSplit {
  phone: number;
  smoking: number;
  capped: boolean;
}

export function useSmokingSplit(from?: string, to?: string, enabled = true) {
  return useQuery({
    queryKey: ["nvr-smoking-split", from ?? "", to ?? ""],
    queryFn: async (): Promise<SmokingSplit> => {
      const page = await listEvents("smoking", { limit: NVR_MAX_LIMIT, date_from: from, date_to: to });
      let phone = 0;
      for (const e of page.events) if (isPhoneEvent(e)) phone++;
      return { phone, smoking: page.events.length - phone, capped: page.total > page.events.length };
    },
    enabled,
    staleTime: 60_000,
    refetchInterval: liveInterval(60_000, 5 * 60_000),
  });
}
