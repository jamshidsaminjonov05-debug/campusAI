import { create } from "zustand";
import type { PersonType } from "@/lib/api";
import type { MapEvent } from "@/map/types";
import type { VoiceCameraCommand, VoiceEventFilter, VoiceMapAction, VoicePersonSearch } from "@/services/voice/VoiceCommands";
import { initialPage } from "@/lib/pageRoute";

/** Bir marta ishlaydigan buyruq — qiymat o'zgarmasa ham `nonce` orqali qayta trigger bo'ladi. */
interface VoiceTrigger<T> {
  value: T;
  nonce: number;
}

function trigger<T>(value: T | null): VoiceTrigger<T> | null {
  return value === null ? null : { value, nonce: Date.now() };
}

interface AppState {
  selectedTeknikum: string | null;
  activeCameraId: string;
  pitch3D: boolean;
  activePage: string;
  /** Jadval/ro'yxatdan tanlangan hodisa — xarita flyTo qilib popup ochadi. */
  focusedEvent: MapEvent | null;
  /** Trevoga kartochkasidan ochilgan hodisa id'si — EventsPage uni tanlab, `null` qaytaradi. */
  focusedAlertId: string | null;
  /** 3D kampus markeridan ochilgan kuzatuv posti hodisasi — DetectionsPage uni tanlab, `null` qaytaradi. */
  focusedDetectionId: number | null;
  setSelectedTeknikum: (id: string | null) => void;
  setActiveCameraId: (id: string) => void;
  togglePitch3D: () => void;
  setActivePage: (page: string) => void;
  setFocusedEvent: (ev: MapEvent | null) => void;
  setFocusedAlertId: (id: string | null) => void;
  setFocusedDetectionId: (id: number | null) => void;

  /* ---------------- Ovozli buyruqlar (VoiceProvider dispatch qiladi, ---------------- */
  /* ---------------- tegishli sahifa/xarita bridge iste'mol qilib tozalaydi) --------- */
  voiceRegionTarget: VoiceTrigger<string> | null;
  setVoiceRegionTarget: (region: string | null) => void;
  /** Muassasa id'si — Geo Analitikani shu muassasa TANLANGAN holda ochadi
   *  (xaritada belgilab). `StatInstitutions.tsx` "Xaritada ochish" tugmasi
   *  ishlatadi — `voiceRegionTarget` bilan bir xil naqsh. */
  voiceCampusTarget: VoiceTrigger<string> | null;
  setVoiceCampusTarget: (id: string | null) => void;
  voiceMapAction: VoiceTrigger<VoiceMapAction> | null;
  setVoiceMapAction: (action: VoiceMapAction | null) => void;
  voiceCameraCommand: VoiceTrigger<VoiceCameraCommand> | null;
  setVoiceCameraCommand: (cmd: VoiceCameraCommand | null) => void;
  voiceEventFilter: VoiceTrigger<VoiceEventFilter> | null;
  setVoiceEventFilter: (filter: VoiceEventFilter | null) => void;
  voicePersonSearch: VoiceTrigger<VoicePersonSearch> | null;
  setVoicePersonSearch: (search: VoicePersonSearch | null) => void;

  /**
   * Boshqaruv panelidagi "Bugungi davomat" kartochkasi bosilganda —
   * Statistika sahifasining O'qituvchi/Talabalar/Xodimlar tabini ochadi.
   * `StatisticsPage` iste'mol qilib `null` qaytaradi (ovozli kanallar bilan
   * bir xil naqsh — `trigger()` qayta bosilganda ham ishlashini kafolatlaydi).
   */
  /**
   * "Muassasalar" bo'limi QAYSI tab bilan ochilsin.
   *
   * Statistika → Umumiy dagi "Muassasalar" kartochkasi bosilganda
   * HUDUDLAR kesimi ochilishi kerak (sahifaning o'z standarti —
   * "Muassasalar"). `personTypeTarget` bilan AYNI naqsh: yuboruvchi
   * qo'yadi, sahifa `useEffect`da iste'mol qilib `null` qaytaradi.
   */
  institutionsTab: VoiceTrigger<"regions" | "institutions"> | null;
  setInstitutionsTab: (tab: "regions" | "institutions" | null) => void;
  personTypeTarget: VoiceTrigger<PersonType> | null;
  setPersonTypeTarget: (type: PersonType | null) => void;
}

/**
 * Ochilishdagi muassasa — **hech biri** (`null`), ya'ni UMUMIY ko'rinish.
 *
 * Boshqaruv paneli respublika XARITASIDAN boshlanadi; muassasa tanlansa
 * kadr unga uchib borib 3D kampus ochiladi (`DashboardScreen`).
 *
 * ⚠️ Bir muddat bu yerda `INSTITUTIONS[0]` turgan edi — ilova darhol bitta
 * maktabga kirib ketardi va umumiy manzara ko'rinmasdi.
 */
/**
 * 🔵 **OCHILISHDA KUZATUVDAGI MUASSASA** (2026-09-05, foydalanuvchi
 * so'rovi: "boshqaruv panelida default 3D xarita tursin").
 *
 * `DashboardScreen` ochilishdagi ko'rinishni shu tanlovga qarab
 * belgilaydi: kuzatuvdagi (3D kampusi bor) muassasa tanlangan bo'lsa
 * BIRINCHI kadrdanoq **3D kampus** chiziladi, aks holda respublika
 * xaritasi.
 *
 * ⚠️ Bir muddat bu yerda `null` turgan edi ("umumiy manzara"), undan
 * oldin esa `INSTITUTIONS[0]`. Mock olib tashlangach "umumiy manzara"
 * amalda bo'sh xarita bo'lib qoldi — kuzatuv BITTA obyektda, ya'ni
 * ko'rsatadigan narsa o'sha yerda.
 */
export const DEFAULT_INSTITUTION_ID: string | null = "edu-mk-179";

/**
 * Boshlang'ich muassasa — hech biri (umumiy manzara).
 *
 * ⚠️ Ilgari bu yerda "Aniq statistika" rejimi tekshirilardi
 * (`isExactMode() ? EXACT_INSTITUTION_ID : …`). Rejim tushunchasi
 * OLIB TASHLANDI: mock butunlay o'chirilgach ikkinchi rejim qolmadi —
 * ilova doim haqiqiy manbadan o'qiydi, manba yo'q joyda esa QIZIL
 * "ma'lumot yo'q" ko'rsatiladi (`components/common/Missing.tsx`).
 */
function initialInstitution(): string | null {
  return DEFAULT_INSTITUTION_ID;
}

export const useAppStore = create<AppState>((set) => ({
  selectedTeknikum: initialInstitution(),
  activeCameraId: "0412",
  pitch3D: false,
  /* ⚠️ Ochilishdagi bo'lim — URL (`/panel#kameralar`), so'ng
     `localStorage`, so'ng default (`lib/pageRoute.ts`). Ilgari bu yerda
     qat'iy "Boshqaruv paneli" turardi: sahifa yangilansa yoki havola
     bo'yicha kelinsa foydalanuvchi doim boshiga qaytarilardi.
     SSR'da `location` yo'q — `initialPage()` o'zi tekshiradi va
     default qaytaradi (`/panel` baribir `ssr:false`). */
  activePage: initialPage(),
  focusedEvent: null,
  focusedAlertId: null,
  focusedDetectionId: null,
  setSelectedTeknikum: (id) =>
    set({
      selectedTeknikum: id,
      activeCameraId: id ? `0${400 + parseInt(id.slice(-2), 10)}` : "0412",
      // Eski hodisa fokusi tanlangan texnikumga uchishga xalaqit bermasin
      focusedEvent: null,
    }),
  setActiveCameraId: (id) => set({ activeCameraId: id }),
  togglePitch3D: () => set((s) => ({ pitch3D: !s.pitch3D })),
  setActivePage: (page) => set({ activePage: page }),
  setFocusedEvent: (ev) => set({ focusedEvent: ev }),
  setFocusedAlertId: (id) => set({ focusedAlertId: id }),
  setFocusedDetectionId: (id) => set({ focusedDetectionId: id }),

  voiceRegionTarget: null,
  setVoiceRegionTarget: (region) => set({ voiceRegionTarget: trigger(region) }),
  voiceCampusTarget: null,
  setVoiceCampusTarget: (id) => set({ voiceCampusTarget: trigger(id) }),
  voiceMapAction: null,
  setVoiceMapAction: (action) => set({ voiceMapAction: trigger(action) }),
  voiceCameraCommand: null,
  setVoiceCameraCommand: (cmd) => set({ voiceCameraCommand: trigger(cmd) }),
  voiceEventFilter: null,
  setVoiceEventFilter: (filter) => set({ voiceEventFilter: trigger(filter) }),
  voicePersonSearch: null,
  setVoicePersonSearch: (search) => set({ voicePersonSearch: trigger(search) }),

  institutionsTab: null,
  setInstitutionsTab: (tab) => set({ institutionsTab: trigger(tab) }),
  personTypeTarget: null,
  setPersonTypeTarget: (type) => set({ personTypeTarget: trigger(type) }),
}));
