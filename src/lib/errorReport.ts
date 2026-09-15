/**
 * Klient xatolarini markazga yuborish.
 *
 * NEGA: panel bir maktabda ishdan chiqsa, hozir buni faqat o'sha yerdagi
 * operator ko'radi. 645 maktabda bu — nosozlikni umuman bilmaslik demakdir.
 *
 * QOIDALARI:
 *   - Backend endpoint hali yo'q → JIM o'tadi, UI hech qachon buzilmaydi.
 *   - Offline bo'lsa navbatga yig'iladi (maks 20 ta) va keyin yuboriladi.
 *   - SHAXSIY MA'LUMOT YUBORILMAYDI: ism, foto, token — hech biri.
 *     Faqat texnik kontekst: muassasa id'si, sahifa, xato matni, brauzer.
 */
import { API_BASE } from "@/config/endpoints";
import { getInstitutionScope } from "@/lib/institutionScope";

const QUEUE_KEY = "campus-error-queue";
const MAX_QUEUED = 20;
/** Xato matni shundan uzun bo'lsa kesiladi — tarmoqni bo'g'masin. */
const MAX_LEN = 2000;

export interface ClientErrorReport {
  /** Qaysi muassasa (bo'lsa) — `lib/institutionScope.ts` dan. */
  institution_id: string | null;
  /** Qaysi bo'lim yiqildi (`ErrorBoundary` label'i). */
  section: string;
  message: string;
  stack: string | null;
  /** Brauzer/OS — nosozlik faqat ma'lum brauzerda bo'lsa bilinsin. */
  user_agent: string;
  url: string;
  at: string;
}

function readQueue(): ClientErrorReport[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items: ClientErrorReport[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUED)));
  } catch {
    /* localStorage to'la yoki yopiq — navbat saqlanmaydi, zarar yo'q */
  }
}

/** Bitta hisobotni yuborish. `false` — yuborilmadi (navbatga qaytariladi). */
async function send(report: ClientErrorReport): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/client-errors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
      // Sahifa yopilayotgan bo'lsa ham yetib borsin
      keepalive: true,
    });
    /* Endpoint yo'q yoki qabul qilmaydi — KUTILGAN: navbatda saqlamaymiz, jim tashlaymiz.
       ⚠️ Faqat 404 EMAS (2026-09-15): kuzatuv posti serverida bu yo'l umuman yo'q
       va u tokensiz `401`, kalit bilan `405` qaytaradi (o'lchandi). Ilgari
       `401` navbatga qaytarilib, HAR yangi xatoda qayta yuborilardi —
       konsol `POST …/client-errors 401` bilan to'lardi. */
    if ([401, 403, 404, 405].includes(res.status)) return true;
    return res.ok;
  } catch {
    return false; // tarmoq yo'q — navbatda qoladi
  }
}

/** Navbatdagilarni yuborishga urinish (yangi xato kelganda chaqiriladi). */
async function flushQueue(): Promise<void> {
  const queued = readQueue();
  if (queued.length === 0) return;
  const remaining: ClientErrorReport[] = [];
  for (const item of queued) {
    if (!(await send(item))) remaining.push(item);
  }
  writeQueue(remaining);
}

/**
 * Xatoni markazga yuborish. Hech qachon `throw` qilmaydi va hech qachon
 * chaqiruvchini kutdirmaydi (fon rejimida ketadi).
 */
export function reportClientError(error: Error, section: string, componentStack?: string | null): void {
  let report: ClientErrorReport;
  try {
    report = {
      institution_id: getInstitutionScope().institutionId,
      section,
      message: String(error?.message ?? error).slice(0, MAX_LEN),
      stack: (componentStack ?? error?.stack ?? null)?.slice(0, MAX_LEN) ?? null,
      user_agent: navigator.userAgent,
      url: location.pathname, // ATAYLAB faqat yo'l — query'da shaxsiy ma'lumot bo'lishi mumkin
      at: new Date().toISOString(),
    };
  } catch {
    return; // hisobotni yig'ishning o'zi yiqilsa — jim chiqamiz
  }

  void (async () => {
    if (!(await send(report))) writeQueue([...readQueue(), report]);
    await flushQueue();
  })();
}
