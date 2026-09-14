/** Xaritada ko'rsatiladigan hodisa — har doim koordinatali. */
export interface MapEvent {
  id: string;
  latitude: number;
  longitude: number;
  cameraId: string;
  cameraName: string;
  /** ISO string yoki epoch ms */
  time: string | number;
  /** Snapshot/preview rasm URL (bo'lmasa default preview ishlatiladi) */
  image?: string | null;
  type: string;
  alarm: boolean;
}

/** Kelajakdagi marshrut (backend 2-3 koordinata yuboradi). */
export interface RouteSpec {
  id: string;
  coordinates: [number, number][];
}

/** Xarita boshlang'ich ko'rinishi. */
export interface MapView {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

export type MapStatus = "loading" | "ready" | "fallback" | "error";
