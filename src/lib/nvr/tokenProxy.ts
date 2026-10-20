/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  LOGIN/PAROL → JWT bilan ishlaydigan xizmatlar uchun UMUMIY proxy    ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * "2-versiya" API'lari (`weapon2` — qurol, `janjal2` — janjal) ikkalasi ham
 * `X-API-Key` emas, **login/parol → JWT token** bilan ishlaydi
 * (`POST /auth/login`, `OAuth2PasswordBearer`). Token bir necha soatdan keyin
 * eskiradi. Ular AYNI naqshda proxy qilinadi, shuning uchun mantiq shu yerda
 * BIR MARTA yozildi — har bir route handler faqat xizmat `id`sini beradi.
 *
 * Har bir xizmat uchun:
 *   1. login/parol FAQAT serverda, `.env.local`dan (`credsOf(id)`) o'qiladi —
 *      brauzer ularni HECH QACHON ko'rmaydi;
 *   2. token SERVER XOTIRASIDA keshlanadi (`cached`, xizmatga XOS closure) va
 *      muddati tugashidan oldin o'zi qayta login qiladi — brauzer sezmaydi;
 *   3. upstream `401` qaytarsa (token kutilmaganda bekor qilingan) BIR MARTA
 *      majburiy qayta login qilinadi va so'rov qaytariladi.
 *
 * ── SESSIYA HIMOYASI — kuzatuv posti proxy'dagi bilan AYNI qoida ──────────────────
 * `campus-session` cookie tekshiruvi: panelga kirmagan hech kim bu manzilga
 * (demak — aniqlash rasm/videolariga) umuman yeta olmaydi.
 *
 * ── FAQAT O'QISH (`GET`/`HEAD`) ──────────────────────────────────────────
 * Frontend bu API'lardan faqat hodisa RO'YXATI, rasm va videoni o'qiydi —
 * yozish kerak emas, shuning uchun boshqa metodlar ATAYLAB berilmagan
 * (kichikroq hujum yuzasi).
 */
import { NextRequest, NextResponse } from "next/server";
import { credsOf, originOf } from "../../../config/services.mjs";
import { SESSION_COOKIE } from "@/lib/nvr/nvrSession";

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

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  UPSTREAM YO'LI — Next'ning trailing-slash redirectidan KEYIN         ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * 🔴 2026-09-18, foydalanuvchi xabar qildi: "2chi versiyani bosgan
 * vaqtimda ... login xatosi 401" — sinab ko'rilganda haqiqiy sabab
 * `camera/list` uchun **`422`** ekani aniqlandi.
 *
 * Sabab ikki bosqichli:
 *  1. Next.js `trailingSlash: false` (default) — brauzer
 *     `/weapon2/api/cams/camera/list/` so'rasa, bizning route
 *     handler ISHGA TUSHISHIDAN OLDIN Next o'zi **`308`** bilan
 *     oxiridagi `/` ni olib tashlab qayta yo'naltiradi (`fetch()`
 *     buni brauzerda SEZILMASDAN kuzatadi) — ya'ni `params.path` bu
 *     yerga ALLAQACHON `/`siz yetib keladi, asl so'rov shaklini
 *     "tiklab bo'lmaydi".
 *  2. Upstream (`weapon2`/`janjal2`, ikkalasi ham BIR XIL dastur)
 *     `GET /api/cams/camera/list` (`/`siz) ni **`/api/cams/
 *     camera/{camera_id}`** dinamik yo'liga mos deb biladi va
 *     "list"ni `camera_id` sifatida o'qishga urinadi → **`422`**
 *     (`int_parsing`, o'lchandi: `<weapon2-ip>:<port>` ga to'g'ridan-
 *     to'g'ri so'rov bilan). `/` bilan esa **`200`** — to'g'ri
 *     "hammasi" yo'liga tushadi.
 *
 * Yechim BU SERVER SO'ROVIGA (proxy → upstream) tegishli — Next'ning
 * MARSHRUTLASHIGA BOG'LIQ EMAS: shu yerda `/`ni QAYTA qo'shsak
 * kifoya, Next allaqachon ishlab bo'lgan (brauzer buni ko'rmaydi).
 *
 * ⚠️ **Faqat SHU BITTA yo'l** — boshqa hech qaysi path o'zgartirilmaydi
 * (rasm/video statik fayllar, `alert-list` va h.k. `/`siz ham to'g'ri
 * ishlaydi, upstream ularni o'zi 307 bilan tuzatadi — faqat
 * `camera/list` upstream'da DINAMIK yo'l bilan TO'QNASHADI).
 *
 * Sof funksiya — tarmoqqa bog'liq emas, `tokenProxy.test.ts`da
 * to'g'ridan-to'g'ri sinaladi.
 */
export function normalizeUpstreamPath(path: string): string {
  return path === "api/cams/camera/list" ? `${path}/` : path;
}

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

/**
 * Bitta xizmat uchun `{ GET, HEAD }` route handler'larini yasaydi.
 *
 * Token — SHU CHAQIRUV closure'ida keshlanadi, ya'ni har xizmat o'z tokeniga
 * ega (Next dev/prod bitta uzoq ishlaydigan Node jarayoni — kesh butun server
 * hayoti davomida yashaydi, har foydalanuvchi so'rovida QAYTA login qilinMAYDI).
 */
export function makeTokenProxy(id: "weapon2" | "janjal2") {
  const ORIGIN = originOf(id);
  const CREDS = credsOf(id);

  let cached: { token: string; exp: number } | null = null;

  async function login(): Promise<string> {
    if (!CREDS) {
      throw new Error(`${id} login/parol .env.local faylida ko'rsatilmagan`);
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
      throw new Error(`${id} login muvaffaqiyatsiz — ${res.status}`);
    }
    const data = (await res.json()) as { access_token?: string };
    if (!data.access_token) throw new Error(`${id} login javobida access_token yo'q`);
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

    // Trailing-slash tuzog'i — `normalizeUpstreamPath()` izohiga qarang.
    const path = normalizeUpstreamPath((params.path ?? []).join("/"));
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
        return NextResponse.json({ error: `${id} serveriga kirib bo'lmadi`, detail: String(e) }, { status: 502 });
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
      return Response.json({ error: `${id} serveriga ulanib bo'lmadi`, target, detail: String(e) }, { status: 502 });
    }
  }

  return {
    GET: (req: NextRequest, ctx: { params: { path?: string[] } }) => proxy(req, ctx.params),
    /** Video `Range` tekshiruvi uchun — kuzatuv posti proxy'dagi bilan bir xil sabab. */
    HEAD: (req: NextRequest, ctx: { params: { path?: string[] } }) => proxy(req, ctx.params),
  };
}
