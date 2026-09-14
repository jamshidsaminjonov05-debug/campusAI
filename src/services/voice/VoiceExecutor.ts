import {
  PAGE_FEEDBACK,
  type PageName,
  type VoiceCameraCommand,
  type VoiceEventFilter,
  type VoiceMapAction,
  type VoicePersonSearch,
} from "./VoiceCommands";
import type { IntentId } from "./VoiceCommandRegistry";
import { similarity, type IntentPrediction } from "./VoiceIntentPredictor";
import type { VoiceEntities } from "./VoiceEntityExtractor";
import { normalizeTranscript, stem } from "./VoiceNormalizer";

export interface ExecResult {
  ok: boolean;
  message: string;
}

export interface ExecutorDeps {
  activePage: string;
  selectedTeknikum: string | null;
  texnikums: { id: string; name: string; region: string; lng: number; lat: number }[];
  regions: { name: string }[];
  setActivePage: (p: PageName) => void;
  setSelectedTeknikum: (id: string) => void;
  setVoiceRegionTarget: (r: string) => void;
  setVoiceMapAction: (a: VoiceMapAction) => void;
  setVoiceCameraCommand: (c: VoiceCameraCommand) => void;
  setVoiceEventFilter: (f: VoiceEventFilter) => void;
  setVoicePersonSearch: (s: VoicePersonSearch) => void;
}

const HOME_CENTER: [number, number] = [64.0, 41.0];

function ensureMapPage(d: ExecutorDeps): void {
  if (d.activePage !== "Boshqaruv paneli" && d.activePage !== "Geo Analitika") d.setActivePage("Boshqaruv paneli");
}

type Handler = (e: VoiceEntities, d: ExecutorDeps) => ExecResult;

/** IntentId → bajaruvchi funksiya. Yangi buyruq = registry yozuvi + shu yerda handler. */
const HANDLERS: Record<IntentId, Handler> = {
  "nav.dashboard": (_e, d) => { d.setActivePage("Boshqaruv paneli"); return { ok: true, message: PAGE_FEEDBACK["Boshqaruv paneli"] }; },
  "nav.cameras": (_e, d) => { d.setActivePage("Kameralar"); return { ok: true, message: PAGE_FEEDBACK.Kameralar }; },
  "nav.students": (_e, d) => { d.setActivePage("Shaxslar"); return { ok: true, message: PAGE_FEEDBACK.Shaxslar }; },
  "nav.teachers": (_e, d) => { d.setActivePage("Shaxslar"); return { ok: true, message: PAGE_FEEDBACK.Shaxslar }; },
  "nav.geo": (_e, d) => { d.setActivePage("Geo Analitika"); return { ok: true, message: PAGE_FEEDBACK["Geo Analitika"] }; },
  "nav.events": (_e, d) => { d.setActivePage("Hodisalar"); return { ok: true, message: PAGE_FEEDBACK.Hodisalar }; },
  "nav.reports": (_e, d) => { d.setActivePage("Hisobotlar"); return { ok: true, message: PAGE_FEEDBACK.Hisobotlar }; },
  "nav.settings": (_e, d) => { d.setActivePage("Sozlamalar"); return { ok: true, message: PAGE_FEEDBACK.Sozlamalar }; },

  "search.person": (e, d) => {
    if (!e.personName) return { ok: false, message: "Ismni tushunolmadim." };
    const type = e.personType ?? "student";
    d.setActivePage("Shaxslar");
    d.setVoicePersonSearch({ query: e.personName, personType: type });
    return { ok: true, message: `"${e.personName}" qidirilmoqda.` };
  },

  "camera.open": (e, d) => {
    if (e.cameraNumber === undefined) return { ok: false, message: "Kamera raqamini tushunolmadim." };
    d.setActivePage("Kameralar");
    d.setVoiceCameraCommand({ selectIndex: e.cameraNumber });
    return { ok: true, message: `${e.cameraNumber}-kamera ochildi.` };
  },
  "camera.first": (_e, d) => { d.setActivePage("Kameralar"); d.setVoiceCameraCommand({ selectIndex: 1 }); return { ok: true, message: "Birinchi kamera ochildi." }; },
  "camera.play": (_e, d) => { d.setActivePage("Kameralar"); d.setVoiceCameraCommand({ action: "play" }); return { ok: true, message: "Jonli efir ishga tushirildi." }; },
  "camera.pause": (_e, d) => { d.setActivePage("Kameralar"); d.setVoiceCameraCommand({ action: "pause" }); return { ok: true, message: "Jonli efir to'xtatildi." }; },
  "camera.fullscreen": (_e, d) => { d.setActivePage("Kameralar"); d.setVoiceCameraCommand({ action: "fullscreen" }); return { ok: true, message: "To'liq ekran rejimi yoqildi." }; },

  "events.filter": (e, d) => {
    if (!e.eventType) return { ok: false, message: "Hodisa turini tushunolmadim." };
    d.setActivePage("Hodisalar");
    d.setVoiceEventFilter({ eventType: e.eventType });
    return { ok: true, message: "Hodisalar filtrlandi." };
  },

  "map.open": (_e, d) => { ensureMapPage(d); return { ok: true, message: "Xarita ochildi." }; },
  "map.zoomIn": (_e, d) => { ensureMapPage(d); d.setVoiceMapAction({ type: "zoomIn" }); return { ok: true, message: "Masshtab kattalashtirildi." }; },
  "map.zoomOut": (_e, d) => { ensureMapPage(d); d.setVoiceMapAction({ type: "zoomOut" }); return { ok: true, message: "Masshtab kichraytirildi." }; },
  "map.reset": (_e, d) => { ensureMapPage(d); d.setVoiceMapAction({ type: "reset" }); return { ok: true, message: "Xarita markazga qaytarildi." }; },
  "map.route": (_e, d) => {
    ensureMapPage(d);
    const tk = d.texnikums.find((t) => t.id === d.selectedTeknikum);
    if (!tk) return { ok: false, message: "Avval texnikumni tanlang." };
    d.setVoiceMapAction({ type: "showRoute", coordinates: [HOME_CENTER, [tk.lng, tk.lat]] });
    return { ok: true, message: "Marshrut ko'rsatildi." };
  },
  "map.place": (e, d) => {
    const q = normalizeTranscript(e.placeQuery ?? "");
    if (!q) return { ok: false, message: "Joyni tushunolmadim." };
    const region = d.regions.find((r) => similarity(stem(q), stem(normalizeTranscript(r.name))) > 0.5 || normalizeTranscript(r.name).includes(q));
    if (region) {
      d.setActivePage("Geo Analitika");
      d.setVoiceRegionTarget(region.name);
      return { ok: true, message: `Hudud ko'rsatildi: ${region.name}.` };
    }
    const tk = d.texnikums.find((t) => normalizeTranscript(t.name).includes(q) || normalizeTranscript(t.region).includes(q));
    if (tk) {
      d.setActivePage("Boshqaruv paneli");
      d.setSelectedTeknikum(tk.id);
      return { ok: true, message: `Texnikum topildi: ${tk.name}.` };
    }
    return { ok: false, message: "Hudud yoki texnikum topilmadi." };
  },

  "attendance.today": (_e, d) => { d.setActivePage("Hisobotlar"); return { ok: true, message: "Bugungi davomat ochildi." }; },
  "attendance.absent": (_e, d) => { d.setActivePage("Hisobotlar"); return { ok: true, message: "Davomat ochildi — kelmaganlarni ko'ring." }; },

  "ai.today": (_e, d) => { d.setActivePage("Boshqaruv paneli"); return { ok: true, message: "Bugungi umumiy holat ko'rsatildi." }; },
  "ai.topEvents": (_e, d) => { d.setActivePage("Geo Analitika"); return { ok: true, message: "Geo analitika — hodisalar bo'yicha ko'ring." }; },
  "ai.lowAttendance": (_e, d) => { d.setActivePage("Geo Analitika"); return { ok: true, message: "Geo analitika — davomat bo'yicha ko'ring." }; },
};

/** Taxminlangan buyruqni bajaradi va foydalanuvchiga javob matnini qaytaradi. */
export function executeIntent(prediction: IntentPrediction, deps: ExecutorDeps): ExecResult {
  const handler = HANDLERS[prediction.id];
  if (!handler) return { ok: false, message: "Buyruq tushunilmadi." };
  return handler(prediction.entities, deps);
}
