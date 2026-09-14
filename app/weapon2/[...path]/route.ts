/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  QUROL/JANJAL ANIQLASH — 2-VERSIYA (lokal) proxy                     ║
 * ║  `/weapon2/...` → `${WEAPON2_ORIGIN}/...`                            ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * 2026-09-09, foydalanuvchi so'rovi: "biz o'zimizni lokal versiyamizni ham
 * o'qitamiz... aniqlanganlar qismida 2chi versiya button qo'yiladi...
 * ikkinchisiga ham login parol bilan kiriladi... securitysi bilan yaxshilab
 * to'g'irlashimiz kerak... bu faqat .env fileda bo'lishi kerak".
 *
 * ── NEGA ALOHIDA ROUTE HANDLER (oddiy rewrite EMAS) ─────────────────────
 * Bu API `X-API-Key` emas, **login/parol → JWT token** bilan ishlaydi
 * (`POST /auth/login`, `OAuth2PasswordBearer`). Token ~8 soatdan keyin
 * eskiradi. Next rewrites na sarlavha qo'sha oladi, na tokenni yangilab
 * turadi — shuning uchun bu yerda:
 *   1. login/parol FAQAT shu faylda, `.env.local`dan (`credsOf("weapon2")`)
 *      o'qiladi — brauzer ularni HECH QACHON ko'rmaydi;
 *   2. token SERVER XOTIRASIDA keshlanadi (`cached`) va muddati tugashidan
 *      oldin o'zi qayta login qiladi — brauzer buni sezmaydi;
 *   3. upstream `401` qaytarsa (token kutilmaganda bekor qilingan bo'lsa)
 *      BIR MARTA majburiy qayta login qilinadi va so'rov qaytariladi.
 *
 * ── SESSIYA HIMOYASI — kuzatuv posti proxy'dagi bilan AYNI qoida ──────────────────
 * `app/nvr/[...path]/route.ts` dagi `campus-session` cookie tekshiruvi bu
 * yerda ham bor: panelga kirmagan hech kim bu manzilga (demak — qurol
 * aniqlash rasm/videolariga) umuman yeta olmaydi. Ikkinchi API qo'shilgani
 * bilan xavfsizlik teshigi qo'shilmasin — bir xil "faqat login qilgan
 * brauzer" qoidasi ikkalasida ham amal qiladi.
 *
 * ── FAQAT O'QISH (`GET`/`HEAD`) ──────────────────────────────────────────
 * Frontend bu API'dan faqat hodisa RO'YXATI, rasm va videoni o'qiydi —
 * yozish (kamera qo'shish/o'chirish, PTZ va h.k.) kerak emas, shuning
 * uchun boshqa metodlar ATAYLAB eksport qilinmagan (kichikroq hujum
 * yuzasi — CLAUDE.md'dagi kuzatuv posti `POST`/`PUT`/`DELETE` tuzog'idan farqli,
 * bu yerda ular ATAYLAB yo'q, unutilgan emas).
 *
 * Nima o'tadi (barchasi upstream ILDIZIDA — `image_path`/`video_path`
 * serverning o'zi shu ko'rinishda qaytaradi, `upstreamPath` bo'sh):
 *   /weapon2/api/alert/alert-list/?page=1&size=24   → hodisalar ro'yxati (JSON)
 *   /weapon2/alert_images/<yo'l>.jpg                → rasm (statik, oqim bilan)
 *   /weapon2/alert_videos/<yo'l>.mp4                → video (statik, `Range` bilan)
 *   /weapon2/api/cams/camera/list/                  → kameralar (nom/joylashuv uchun)
 */
import { NextRequest, NextResponse } from "next/server";
import { credsOf, originOf } from "../../../config/services.mjs";
import { SESSION_COOKIE } from "@/lib/nvrSession";

export const dynamic = "force-dynamic";

const ORIGIN = originOf("weapon2");
const CREDS = credsOf("weapon2");

const FORWARD_REQ = ["range", "if-range", "accept"];
const FORWARD_RES = [
  "content-type",
  "content-length",
  "cache-control",
  "etag",
  "last-modified",
  "accept-ranges",
  "content-range",
  "content-disposition",
];

/** `exp` (soniyada) — JWT payload'dan, imzoni tekshirmasdan (bizga faqat
 *  muddat kerak, haqiqiylikni SERVERNING O'ZI tekshiradi). */
function jwtExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const exp = JSON.parse(json)?.exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/** Token — modul xotirasida keshlanadi. Next dev/prod bitta uzoq
 *  ishlaydigan Node jarayoni bo'lgani uchun bu keshlash butun server
 *  hayoti davomida ishlaydi (har foydalanuvchi so'rovida QAYTA login
 *  qilinMAYDI). */
let cached: { token: string; exp: number } | null = null;

async function login(): Promise<string> {
  if (!CREDS) {
    throw new Error("WEAPON2_USERNAME/WEAPON2_PASSWORD .env.local faylida ko'rsatilmagan");
  }
  const body = new URLSearchParams({
    grant_type: "password",
    username: CREDS.username,
    password: CREDS.password,
  });
  const res = await fetch(`${ORIGIN}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`2-versiya login muvaffaqiyatsiz — ${res.status}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("2-versiya login javobida access_token yo'q");
  // 60 soniya zaxira — so'rov o'rtasida eskirib qolmasin
  const exp = (jwtExpiry(data.access_token) ?? Date.now() + 5 * 60_000) - 60_000;
  cached = { token: data.access_token, exp };
  return cached.token;
}

async function getToken(force = false): Promise<string> {
  if (!force && cached && Date.now() < cached.exp) return cached.token;
  return login();
}

async function proxy(req: NextRequest, params: { path?: string[] }) {
  // kuzatuv posti proxy'dagi bilan AYNI qoida — panelga kirmagan hech kim bu yerga yetmaydi.
  if (!req.cookies.get(SESSION_COOKIE)) {
    return NextResponse.json({ error: "Kirish talab qilinadi" }, { status: 401 });
  }

  const path = (params.path ?? []).join("/");
  const qs = req.nextUrl.search;
  const target = `${ORIGIN}/${path}${qs}`;

  const headers = new Headers();
  for (const h of FORWARD_REQ) {
    const v = req.headers.get(h);
    if (v) headers.set(h, v);
  }
  if (!headers.has("accept")) headers.set("accept", "*/*");

  try {
    let token: string;
    try {
      token = await getToken();
    } catch (e) {
      return NextResponse.json({ error: "2-versiya serveriga kirib bo'lmadi", detail: String(e) }, { status: 502 });
    }
    headers.set("authorization", `Bearer ${token}`);

    let upstream = await fetch(target, { method: "GET", headers, cache: "no-store" });

    // Token kutilmaganda bekor qilingan bo'lsa (masalan server qayta ishga
    // tushgan) — BIR MARTA majburiy qayta login qilib, so'rov qaytariladi.
    if (upstream.status === 401) {
      headers.set("authorization", `Bearer ${await getToken(true)}`);
      upstream = await fetch(target, { method: "GET", headers, cache: "no-store" });
    }

    const out = new Headers();
    for (const h of FORWARD_RES) {
      const v = upstream.headers.get(h);
      if (v) out.set(h, v);
    }
    out.set("X-Accel-Buffering", "no");

    return new Response(upstream.body, { status: upstream.status, headers: out });
  } catch (e) {
    return Response.json(
      { error: "2-versiya serveriga ulanib bo'lmadi", target, detail: String(e) },
      { status: 502 }
    );
  }
}

export function GET(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxy(req, params);
}

/** Video `Range` tekshiruvi uchun — kuzatuv posti proxy'dagi bilan bir xil sabab. */
export function HEAD(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxy(req, params);
}
