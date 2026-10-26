/**
 * KAMPUS 3D MODELLARI — Blender'da yasalgan `.glb` fayllar (2026-09-25).
 *
 * Model MapLibre xaritasiga `three.js` custom layer orqali qo'yiladi
 * (`src/map/maplibre/glbModelLayer.ts`). Model bor kampusda shu kampus
 * binolarining `fill-extrusion` tanasi va protsedural fasadi CHIZILMAYDI
 * (ikkisi ustma-ust tushardi). Bino bosilganda kampus tanlanadi
 * (`app-campus-hit`); ichki ko'rinish (`BuildingInterior`) va uning
 * ko'rinmas `app-campus-model-hit` qatlami 2026-10-26 da olib tashlandi.
 *
 * Model qayerdan keladi:
 *   `tools/campus3d/blender/mk179_generator.py` — Blender skripti,
 *   konturni `public/geojson/campus/<campus>.json` dan o'qiydi. Modelning
 *   (0,0) nuqtasi = o'sha json'dagi `center`, 1 birlik = 1 metr. Kontur
 *   o'zgarsa skript qayta ishga tushiriladi va `.glb` qayta eksport qilinadi.
 *
 * ⚠️ OFFLINE: `.glb` `public/models/` dan olinadi, `three` esa npm orqali
 * bundle'ga kiradi — tashqi CDN/URL YO'Q.
 */
export interface CampusModel {
  /** Muassasa id'si — `config/institutions.ts` dagi `id`. */
  campusId: string;
  /** `public/` ichidagi `.glb` fayl manzili. */
  url: string;
}

export const CAMPUS_MODELS: readonly CampusModel[] = [
  { campusId: "edu-mk-179", url: "/models/mk-179.glb" },
];

/** Shu kampus uchun 3D model (bo'lmasa `undefined`). */
export function campusModelFor(campusId: string): CampusModel | undefined {
  return CAMPUS_MODELS.find((m) => m.campusId === campusId);
}

/** Model qatlamining MapLibre id'si. */
export const campusModelLayerId = (campusId: string) => `app-campus-model-${campusId}`;
