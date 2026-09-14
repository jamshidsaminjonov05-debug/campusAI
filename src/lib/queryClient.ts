import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api";

/**
 * Markaziy React Query sozlamasi — masshtab (1K → 100K) uchun optimallashtirilgan.
 *
 * - `staleTime`: 30s — sahifalar orasida navigatsiya qilganda bir xil ma'lumot
 *   qayta-qayta so'ralmaydi (refetch bo'roni yo'q). Jonli sahifalar o'z
 *   `refetchInterval`ini alohida beradi.
 * - `gcTime`: 5 daqiqa — ishlatilmagan kesh xotirada uzoq turmaydi.
 * - `retry`: tarmoq/5xx da 2 marta (eksponensial), lekin 4xx (401/403/404/422)
 *   da umuman qayta urinilmaydi — foydasiz so'rovlar serverni bo'shitmaydi.
 * - `refetchOnWindowFocus: false` — har fokusда portlash bo'lmasin.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      },
      mutations: {
        retry: false,
      },
    },
  });
}
