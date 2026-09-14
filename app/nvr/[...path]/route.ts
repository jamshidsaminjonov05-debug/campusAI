/**
 * kuzatuv posti proxy — `/nvr/...` → `${NVR_ORIGIN}/api/v1/...`
 *
 * NEGA oddiy rewrite emas: kuzatuv posti API har so'rovda `X-API-Key` sarlavhasini
 * talab qiladi. Next rewrites sarlavha qo'sha olmaydi, kalitni klientga
 * berish esa uni har bir foydalanuvchiga oshkor qilardi. Shu sabab so'rov
 * SERVER tomonda o'tkaziladi va kalit shu yerda qo'shiladi.
 *
 * Nima o'tadi:
 *   /nvr/gun/events?limit=20        → hodisalar tarixi (JSON)
 *   /nvr/events/3641/image          → JPEG rasm (oqim bilan)
 *   /nvr/events/3641/video          → VIDEO (MP4, `Range` bilan)
 *   /nvr/gun/sse                    → jonli oqim (text/event-stream, uzilmaydi)
 *   /nvr/panel/channels             → kanallar/jonli oqim (pastga qarang)
 *
 * ── `panel/` prefiksi — NIMA UCHUN ────────────────────────────────────────
 * Ochiq API'da (`/api/v1/...`) YO'Q narsalar: kanallar ro'yxati, jonli MJPEG
 * oqim, asl `.dav` lavha va kodek ma'lumoti. Ular kuzatuv posti panelining o'z API'sida,
 * `/api/...` ostida turadi. Ikkalasi ham AYNI kalitni qabul qiladi, faqat yo'l
 * prefiksi boshqacha. Shuning uchun:
 *
 *     /nvr/panel/<yo'l>  →  {origin}/api/<yo'l>
 *     /nvr/<yo'l>        →  {origin}/api/v1/<yo'l>
 *
 * Oqim (SSE, rasm, video) BUFERLANMAYDI — javob tanasi to'g'ridan-to'g'ri
 * uzatiladi. Video uchun `Range` sarlavhasi ham o'tkaziladi, aks holda
 * brauzer videoni oldinga-orqaga surа olmaydi.
 */
import { NextRequest, NextResponse } from "next/server";
import { SERVICES, keyOf, originOf } from "../../../config/services.mjs";
import { SESSION_COOKIE } from "@/lib/nvrSession";

// Har so'rov jonli bo'lsin — Next javobni keshlab qo'ymasin
export const dynamic = "force-dynamic";

const ORIGIN = originOf("nvr");
const UPSTREAM = `${ORIGIN}${SERVICES.nvr.upstreamPath}`;
/** Panel API — kanallar, jonli oqim va asl lavha shu yerda (`/api`, `/api/v1` EMAS). */
const PANEL_UPSTREAM = `${ORIGIN}/api`;
const KEY = keyOf("nvr") ?? "";

/** Videoni surish (seek) uchun brauzer shu sarlavhalarni yuboradi/kutadi.
 *  ⚠️ `content-type` SHART — `POST`/`PUT` so'rovlari JSON (`enroll`,
 *  `assign`) yoki `multipart/form-data` (`createNvrPerson` rasm bilan)
 *  yuboradi; buni forward qilmasak upstream tanani noto'g'ri talqin
 *  qilardi (ayniqsa `multipart` chegara belgisi Content-Type ichida). */
const FORWARD_REQ = ["range", "if-range", "accept", "content-type"];
const FORWARD_RES = [
  "content-type",
  "content-length",
  "cache-control",
  "etag",
  "last-modified",
  "accept-ranges",
  "content-range",
  "content-disposition",
  // 202 ("video hali tayyorlanmoqda") bilan birga keladi
  "retry-after",
];

async function proxy(req: NextRequest, params: { path?: string[] }) {
  /* ⚠️ **LOGIN TALAB QILINADI** (2026-09-06 da qo'shildi) — ilgari bu
     yo'l TOKENSIZ ochiq edi: kim bo'lsa ham `curl` bilan yuz bazasi va
     videolarni to'g'ridan-to'g'ri olishi mumkin edi (o'lchandi va
     tuzatildi). Sessiya cookie'si `app/session/route.ts` da qo'yiladi —
     batafsil izoh o'sha faylda. kuzatuv posti serveriga so'rov UMUMAN yubormasdan,
     shu yerda to'xtatiladi. */
  if (!req.cookies.get(SESSION_COOKIE)) {
    return NextResponse.json({ error: "Kirish talab qilinadi" }, { status: 401 });
  }

  const parts = params.path ?? [];
  const panel = parts[0] === "panel";
  const path = (panel ? parts.slice(1) : parts).join("/");
  const qs = req.nextUrl.search;
  const target = `${panel ? PANEL_UPSTREAM : UPSTREAM}/${path}${qs}`;

  try {
    const headers = new Headers({ "X-API-Key": KEY });
    for (const h of FORWARD_REQ) {
      const v = req.headers.get(h);
      if (v) headers.set(h, v);
    }
    if (!headers.has("accept")) headers.set("accept", "*/*");

    /* ⚠️ TANA (`body`) — `GET`/`HEAD` da BERILMAYDI (fetch shunday
       so'raydi, aks holda `TypeError`). Boshqa metodlarda esa `req.body`
       oqim sifatida to'g'ridan-to'g'ri uzatiladi — JSON ham, ko'p qismli
       (`multipart/form-data`, rasm bilan) ham, qayta o'qib-yozilmasdan. */
    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? req.body : undefined,
      cache: "no-store",
      // @ts-expect-error — Node fetch'da oqim tanasini uzatish uchun shart
      duplex: "half",
    });

    const out = new Headers();
    for (const h of FORWARD_RES) {
      const v = upstream.headers.get(h);
      if (v) out.set(h, v);
    }
    // Nginx/proxy oqimni buferlamasin (SSE uchun muhim)
    out.set("X-Accel-Buffering", "no");

    return new Response(upstream.body, { status: upstream.status, headers: out });
  } catch (e) {
    return Response.json(
      { error: "kuzatuv posti serveriga ulanib bo'lmadi", target: target.replace(KEY, "***"), detail: String(e) },
      { status: 502 }
    );
  }
}

/**
 * `GET` — o'qish (ro'yxat, bitta hodisa, rasm, video).
 *
 * ⚠️ `POST`/`PUT`/`DELETE` HAM SHU FAYLDA — ilgari faqat `GET`/`HEAD`
 * eksport qilingan edi va yuz bazasini o'zgartiruvchi HAMMA so'rov
 * (`createNvrPerson`, `updateNvrPerson`, `deleteNvrPerson`,
 * `enrollFaceFromEvent`, `assignFace` — `lib/nvrApi.ts`) Next'ning o'zidan
 * **`405 Method Not Allowed`** olardi — kuzatuv posti serverga umuman yetib
 * bormasdi (o'lchandi 2026-09-06: Route Handler'da mos metod eksporti
 * bo'lmasa Next so'rovni proxy funksiyaga UMUMAN uzatmaydi). "Yuz
 * bazasi" bo'limidagi qo'shish/o'chirish, "Bazaga qo'shish" va
 * "Bog'lash" tugmalari shu sabab hech qachon ishlamagan.
 */
export function GET(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxy(req, params);
}

export function POST(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxy(req, params);
}

export function PUT(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxy(req, params);
}

export function DELETE(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxy(req, params);
}

/**
 * `HEAD` — video TAYYORLIGINI tekshirish uchun (`lib/nvrApi.ts` `probeVideo()`).
 *
 * NEGA alohida: `<video>` teg `202` ("hali tayyorlanmoqda") ni xato deb biladi
 * va qayta so'ramaydi, shuning uchun manzilni unga faqat tayyor bo'lganda
 * beramiz. Tekshiruvni `GET` bilan qilsak bir necha MB video bekorga tortilardi;
 * `HEAD` esa faqat sarlavhani oladi. Next `HEAD` ni o'zi qo'shmaydi.
 */
export function HEAD(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxy(req, params);
}
