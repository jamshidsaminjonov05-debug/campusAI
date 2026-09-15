/**
 * Kamera kartochkalari uchun STOP-KADR keshi — SESSIYA davomida saqlanadi.
 *
 * Muammo: Kameralar sahifasi har ochilganda 32 ta kanalning surati qaytadan
 * yuklanardi (~2 MB). Sahifadan chiqib qaytish ham, ro'yxat yangilanishi ham
 * shu narxni to'lardi va kartochkalar "sakrab" qayta chizilardi.
 *
 * Yechim: surat BIR MARTA olinadi va `Blob` sifatida modul darajasida
 * saqlanadi (`URL.createObjectURL`). Keyingi ochilishlarda tarmoqqa umuman
 * chiqilmaydi — rasm darhol paydo bo'ladi. Kesh sahifa to'liq qayta
 * yuklanganda (F5) tozalanadi; qo'lda yangilash uchun `clearThumbs()`.
 *
 * NEGA `<img loading="lazy">` yetarli emas: brauzer keshi javob sarlavhalariga
 * bog'liq (kuzatuv posti `Cache-Control` bermaydi) va kesh chetlab o'tilsa har safar
 * qayta so'raladi. Blob esa xotirada — 32 ta surat ~2 MB.
 *
 * Bir vaqtda ATIGI `MAX_PARALLEL` ta so'rov ketadi: 32 tasi birdan
 * yuborilsa kuzatuv posti sekinlashadi va boshqa so'rovlar (hodisalar, oqim) navbatda
 * qolib ketadi.
 */
import { nvrChannelSnapshotUrl } from "@/lib/nvrApi";

const MAX_PARALLEL = 4;

/** kanal → `blob:` manzil. */
const cache = new Map<number, string>();
/** Ayni damda yuklanayotganlar — bitta kanal ikki marta so'ralmasin. */
const inflight = new Map<number, Promise<string | null>>();

let active = 0;
const waiting: (() => void)[] = [];

function acquire(): Promise<void> {
  if (active < MAX_PARALLEL) {
    active++;
    return Promise.resolve();
  }
  return new Promise((resolve) => waiting.push(resolve));
}

function release(): void {
  const next = waiting.shift();
  if (next) next();
  else active--;
}

/** Keshdagi surat (bo'lsa) — sinxron, birinchi render'da darhol ishlatiladi. */
export function cachedThumb(channel: number): string | undefined {
  return cache.get(channel);
}

/** Suratni oladi (keshda bo'lsa — o'sha). Xato bo'lsa `null`. */
export async function loadThumb(channel: number, bust?: number): Promise<string | null> {
  const hit = cache.get(channel);
  if (hit) return hit;

  const running = inflight.get(channel);
  if (running) return running;

  const task = (async () => {
    await acquire();
    try {
      const res = await fetch(nvrChannelSnapshotUrl(channel, bust), { cache: "no-store" });
      if (!res.ok) return null;
      const blob = await res.blob();
      if (blob.size === 0) return null;
      const url = URL.createObjectURL(blob);
      cache.set(channel, url);
      return url;
    } catch {
      return null; // tarmoq uzildi — kartochka vizir ko'rinishida qoladi
    } finally {
      release();
      inflight.delete(channel);
    }
  })();

  inflight.set(channel, task);
  return task;
}

/** Keshni tozalaydi (qo'lda "Yangilash"). Blob'lar ham bo'shatiladi. */
export function clearThumbs(): void {
  for (const url of cache.values()) URL.revokeObjectURL(url);
  cache.clear();
}