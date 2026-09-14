/**
 * kuzatuv posti kamera nomlarini o'qish.
 *
 * Aniqlash API kamera nomini ERKIN MATN sifatida beradi, lekin amalda unda
 * joylashuv yozilgan: `1-etaj 1-LIFT`, `A-blok KORIDOR-4`, `MOON DARVOZA`.
 * Shu nomdan qavat va xona turini ajratib olamiz — binoning ichki ko'rinishida
 * kamerani to'g'ri qavatga va to'g'ri joyga qo'yish uchun.
 *
 * Nom formati o'zgarsa FAQAT shu fayl tuzatiladi.
 */

import { tr } from "@/i18n";

export type CameraPlaceKind = "lift" | "corridor" | "stairs" | "entrance" | "gate" | "room";

export interface CameraPlace {
  /** Qavat raqami — nomda bo'lmasa `null`. */
  floor: number | null;
  kind: CameraPlaceKind;
  /** Blok/qanot belgisi (`A-blok` → "A"), bo'lmasa `null`. */
  block: string | null;
  /** Nom ichidagi tartib raqam (`KORIDOR-4` → 4), bo'lmasa `null`. */
  index: number | null;
}

/** `1-etaj`, `2 qavat`, `3-qavat`, `F4` ko'rinishlari. */
const FLOOR_RE = /(\d{1,2})\s*-?\s*(?:etaj|qavat)|(?:^|\s)f\s*(\d{1,2})(?:\s|$)/i;
const BLOCK_RE = /([a-zA-Z])\s*-\s*(?:blok|block)/i;
const INDEX_RE = /-\s*(\d{1,3})\s*$/;

const KIND_RULES: [RegExp, CameraPlaceKind][] = [
  [/lift|elevator|lift/i, "lift"],
  [/koridor|corridor|yo'?lak/i, "corridor"],
  [/zina|stair|narvon/i, "stairs"],
  [/darvoza|gate|tashqi|kirish\s*darvoza/i, "gate"],
  [/kirish|entrance|eshik/i, "entrance"],
];

export function parseCameraName(name: string): CameraPlace {
  const floorMatch = name.match(FLOOR_RE);
  const floor = floorMatch ? parseInt(floorMatch[1] ?? floorMatch[2], 10) : null;

  const blockMatch = name.match(BLOCK_RE);
  const indexMatch = name.match(INDEX_RE);

  let kind: CameraPlaceKind = "room";
  for (const [re, k] of KIND_RULES) {
    if (re.test(name)) {
      kind = k;
      break;
    }
  }

  return {
    floor: floor && floor > 0 && floor < 100 ? floor : null,
    kind,
    block: blockMatch ? blockMatch[1].toUpperCase() : null,
    index: indexMatch ? parseInt(indexMatch[1], 10) : null,
  };
}

/**
 * Joy turining ko'rinadigan nomi — interfeys tiliga qarab.
 * Nomni PARSE qilish (yuqoridagi `KIND_RULES`) o'zbekcha kuzatuv posti nomiga tayanadi
 * va tildan qat'i nazar bir xil ishlaydi; tarjima faqat ko'rsatishda.
 */
export function placeLabel(kind: CameraPlaceKind): string {
  return tr().interior.place[kind];
}

/** Tashqi kamera binoning ichki rejasida ko'rsatilmaydi. */
export const isOutdoor = (p: CameraPlace) => p.kind === "gate";
