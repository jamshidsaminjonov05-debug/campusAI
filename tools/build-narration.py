#!/usr/bin/env python3
"""
Taqdimot ovozini generatsiya qiladi.

IKKITA taqdimot bor va ularning ovozi alohida (`--deck`):
    product   `/taqdimot`  — mahsulot imkoniyatlari      (standart)
    investor  `/investor`  — bozor va investitsiya taklifi

Matn:   `<taqdimot>/copy/{uz,en}.ts` → `narration`
Xizmat: O'zbek STT-TTS API — IKKALA TILDA HAM AYOL OVOZI
          o'zbekcha  → POST /qizbola-tts   (Navoiy TTS / CosyVoice2)
          inglizcha  → POST /en-tts-female (Chatterbox, voice-cloning)
Natija: `public/audio/<taqdimot>/<til>/slayd-NN.mp3`
        `<taqdimot>/narrationAudio.ts`

Har bo'lak (cue) ALOHIDA so'raladi, so'ng bitta slayd fayliga ulanadi —
shunda har bo'lakning fayl ichidagi boshlanish vaqti ANIQ ma'lum bo'ladi.
Subtitr va slayd animatsiyalari shu vaqtlarga bog'lanadi, ya'ni ovoz bilan
kadr soniyagacha mos tushadi (`deck/narration.ts`).

Ishlatish:
    python3 tools/build-narration.py                      # mahsulot, ikkala til
    python3 tools/build-narration.py --deck investor      # investor taqdimoti
    python3 tools/build-narration.py --lang en            # faqat inglizcha
    python3 tools/build-narration.py --force              # keshni e'tiborsiz
    python3 tools/build-narration.py --api http://…       # boshqa server

Xizmat ishlamasa skript XATO bilan tugaydi va mavjud fayllarga tegmaydi.
Ovoz umuman bo'lmasa ham taqdimot ishlayveradi (ovozsiz rejim).
"""

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# ── Taqdimotlar ro'yxati ────────────────────────────────────────────────
# Sayt ikkita taqdimotni ko'rsatadi va ularning ovozi ALOHIDA:
#   product  → /taqdimot  — mahsulot imkoniyatlari
#   investor → /investor  — bozor, raqobat va investitsiya taklifi
#
# `cache` — qaysi matndan qaysi fayl chiqqani. `public/` ichida emas:
# u yerda faqat brauzerga keradigan narsa turishi kerak.
#
# ⚠️ `product` keshi ATAYLAB ildizda (`.narration-cache`) qoldirilgan —
# u yerda allaqachon generatsiya qilingan fayllar bor va yo'lni
# o'zgartirish butun taqdimotni qaytadan sintez qilishga majbur qilardi.
DECKS = {
    "product": {
        "copy": ("src", "components", "presentation", "copy"),
        "ts": ("src", "components", "presentation", "narrationAudio.ts"),
        "audio": ("public", "audio", "taqdimot"),
        "url": "/audio/taqdimot",
        "cache": ("tools", ".narration-cache"),
    },
    "investor": {
        "copy": ("src", "components", "investor", "copy"),
        "ts": ("src", "components", "investor", "narrationAudio.ts"),
        "audio": ("public", "audio", "investor"),
        "url": "/audio/investor",
        "cache": ("tools", ".narration-cache", "investor"),
    },
}

# Quyidagilar `main()` da tanlangan taqdimotga qarab to'ldiriladi
COPY_DIR = ""
OUT_TS = ""
OUT_AUDIO = ""
URL_BASE = ""
CACHE = ""
DECK = ""


def select_deck(name: str) -> None:
    """Global yo'llarni tanlangan taqdimotga moslaydi."""
    global COPY_DIR, OUT_TS, OUT_AUDIO, URL_BASE, CACHE, DECK
    d = DECKS[name]
    DECK = name
    COPY_DIR = os.path.join(ROOT, *d["copy"])
    OUT_TS = os.path.join(ROOT, *d["ts"])
    OUT_AUDIO = os.path.join(ROOT, *d["audio"])
    URL_BASE = d["url"]
    CACHE = os.path.join(ROOT, *d["cache"])

API_DEFAULT = "http://10.181.1.139:9090"
ENDPOINT = {"uz": "/qizbola-tts", "en": "/en-tts-female"}

# `/qizbola-tts` tezlikni qabul qiladi (0.5–2.0). Taqdimot uchun biroz
# tezroq: 1.0 da nutq sekin va zal zerikadi.
SPEED = {"uz": 1.12}

SR = 24000          # ichki namuna chastotasi (mono, s16le)
BYTES_PER_S = SR * 2
LEAD_S = 0.25       # boshidagi jimlik — birinchi so'z kesilmasin
GAP_S = 0.45        # bo'laklar orasidagi nafas
TAIL_S = 0.60       # oxiridagi jimlik


# ─────────────────────────────── ffmpeg ────────────────────────────────

def ffmpeg_exe() -> str:
    """Tizimdagi ffmpeg, bo'lmasa `imageio-ffmpeg` bilan kelgan nusxa."""
    from shutil import which
    p = which("ffmpeg")
    if p:
        return p
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        sys.exit("ffmpeg topilmadi. O'rnating: pip install imageio-ffmpeg")


FFMPEG = None


def run_ffmpeg(args: list[str]) -> None:
    r = subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-y", *args], capture_output=True)
    if r.returncode != 0:
        sys.exit(f"ffmpeg xatosi:\n{r.stderr.decode('utf-8', 'replace')}")


# ──────────────────────────── matnni o'qish ────────────────────────────

CUE_RE = re.compile(r'\{\s*at:\s*([\d.]+)\s*,\s*text:\s*"((?:[^"\\]|\\.)*)"\s*\}')


def read_narration(lang: str) -> list[list[str]]:
    """`copy/<lang>.ts` dagi `narration` ni [slayd][bo'lak] matn sifatida o'qiydi.

    TS fayl to'liq parse qilinmaydi — faqat `narration: [` blokining ichidagi
    qavslar sanaladi va har bir ichki `[...]` bitta slayd deb olinadi. Shakl
    `copy/types.ts` bilan qat'iy belgilangani uchun bu yetarli.
    """
    src = open(os.path.join(COPY_DIR, f"{lang}.ts"), encoding="utf-8").read()
    start = src.index("narration: [")
    i = src.index("[", start)
    depth = 0
    slides: list[list[str]] = []
    cur = i
    for j in range(i, len(src)):
        ch = src[j]
        if ch == "[":
            depth += 1
            if depth == 2:
                cur = j
        elif ch == "]":
            depth -= 1
            if depth == 1:
                block = src[cur : j + 1]
                slides.append([unescape(m.group(2)) for m in CUE_RE.finditer(block)])
            elif depth == 0:
                break
    if not slides:
        sys.exit(f"{lang}.ts dagi `narration` o'qilmadi")
    return slides


def unescape(s: str) -> str:
    return s.replace('\\"', '"').replace("\\\\", "\\").replace("\\n", "\n")


# ─────────────────────────────── TTS ───────────────────────────────────

# Xizmat uzoq matnlarda ba'zan 502 qaytaradi (ichki TTS jarayoni band).
# Shuning uchun bir necha marta urinamiz — aks holda uzun run yarim yo'lda
# uzilib, allaqachon yaratilgan fayllar manifestdan tushib qolardi.
RETRIES = 4
RETRY_WAIT = 12  # sekund


def synth(api: str, lang: str, text: str, timeout: int) -> bytes:
    url = api.rstrip("/") + ENDPOINT[lang]
    payload: dict = {"text": text}
    if lang in SPEED:
        payload["speed"] = SPEED[lang]
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")

    last = ""
    for attempt in range(1, RETRIES + 1):
        req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                data = r.read()
            if data:
                return data
            last = "bo'sh javob"
        except urllib.error.URLError as e:
            last = str(e)
        if attempt < RETRIES:
            print(f"      · urinish {attempt}/{RETRIES} muvaffaqiyatsiz ({last}) — {RETRY_WAIT}s kutamiz", flush=True)
            time.sleep(RETRY_WAIT)
    sys.exit(f"TTS xizmatiga ulanib bo'lmadi ({url}): {last}")


def to_raw(data: bytes, tmpdir: str, name: str) -> bytes:
    """Xizmat qaytargan mp3/wav → mono 24 kHz s16le xom PCM."""
    src = os.path.join(tmpdir, f"{name}.in")
    dst = os.path.join(tmpdir, f"{name}.raw")
    with open(src, "wb") as fh:
        fh.write(data)
    run_ffmpeg(["-i", src, "-ac", "1", "-ar", str(SR), "-f", "s16le", dst])
    return open(dst, "rb").read()


def silence(seconds: float) -> bytes:
    return b"\x00" * (int(seconds * SR) * 2)


# ─────────────────────────────── asosiy ────────────────────────────────

def build_lang(api: str, lang: str, force: bool, timeout: int) -> dict[int, dict]:
    slides = read_narration(lang)
    outdir = os.path.join(OUT_AUDIO, lang)
    os.makedirs(outdir, exist_ok=True)
    os.makedirs(CACHE, exist_ok=True)

    manifest: dict[int, dict] = {}
    for si, cues in enumerate(slides):
        name = f"slayd-{si:02d}.mp3"
        mp3_path = os.path.join(outdir, name)
        meta_path = os.path.join(CACHE, f"{lang}-slayd-{si:02d}.json")

        # Kesh: matn o'zgarmagan bo'lsa qayta so'ramaymiz (TTS sekin va GPU yeydi)
        if not force and os.path.exists(mp3_path) and os.path.exists(meta_path):
            meta = json.load(open(meta_path, encoding="utf-8"))
            if meta.get("texts") == cues:
                manifest[si] = {"file": f"{URL_BASE}/{lang}/{name}", "duration": meta["duration"], "offsets": meta["offsets"]}
                print(f"  [{lang}] slayd {si:02d} — kesh ({meta['duration']:.1f}s)", flush=True)
                continue

        with tempfile.TemporaryDirectory() as tmp:
            pcm = bytearray(silence(LEAD_S))
            offsets: list[float] = []
            for ci, text in enumerate(cues):
                offsets.append(len(pcm) / BYTES_PER_S)
                raw = to_raw(synth(api, lang, text, timeout), tmp, f"{si}-{ci}")
                pcm += raw
                if ci < len(cues) - 1:
                    pcm += silence(GAP_S)
            pcm += silence(TAIL_S)

            raw_path = os.path.join(tmp, "all.raw")
            with open(raw_path, "wb") as fh:
                fh.write(pcm)
            run_ffmpeg(["-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", raw_path, "-codec:a", "libmp3lame", "-q:a", "6", mp3_path])

        duration = round(len(pcm) / BYTES_PER_S, 2)
        offsets = [round(o, 2) for o in offsets]
        json.dump({"texts": cues, "duration": duration, "offsets": offsets}, open(meta_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        manifest[si] = {"file": f"{URL_BASE}/{lang}/{name}", "duration": duration, "offsets": offsets}
        kb = os.path.getsize(mp3_path) // 1024
        print(f"  [{lang}] slayd {si:02d} — {duration:5.1f}s · {len(cues)} bo'lak · {kb} KB", flush=True)

    return manifest


def write_ts(all_manifests: dict[str, dict[int, dict]]) -> None:
    langs = []
    for lang, slides in sorted(all_manifests.items()):
        rows = ",\n".join(
            "    %d: { file: %s, duration: %s, offsets: [%s] }"
            % (si, json.dumps(m["file"]), m["duration"], ", ".join(str(o) for o in m["offsets"]))
            for si, m in sorted(slides.items())
        )
        langs.append(f"  {lang}: {{\n{rows},\n  }}")
    body = ",\n".join(langs)

    ts = '''/**
 * Taqdimot ovozi — GENERATSIYA QILINGAN MANIFEST.
 *
 * Yangilash:  python3 tools/build-narration.py --deck %s
 * Manba matn: `copy/uz.ts` va `copy/en.ts` dagi `narration`.
 * Fayllar:    `public%s/<til>/slayd-NN.mp3`
 *
 * `offsets` — har bir bo'lakning FAYL ICHIDAGI o'lchangan boshlanish
 * vaqti. Subtitr va slayd bosqichlari shu vaqtlarga qarab ishlaydi,
 * shuning uchun ovoz bilan animatsiya soniyagacha mos tushadi.
 *
 * Manifest bo'sh bo'lsa taqdimot OVOZSIZ ishlaydi: `copy` dagi
 * rejalashtirilgan vaqtlar ishlatiladi, AI orbi esa sintetik nutq
 * konvertiga qarab jonlanadi. Ya'ni ovoz yo'qligi hech narsani buzmaydi.
 *
 * ⚠️ QO'LDA TAHRIRLAMANG — skriptni qayta ishga tushiring.
 */

export type AudioSegment = {
  /** `public/` ichidagi manzil */
  file: string;
  /** to'liq uzunlik, sekund */
  duration: number;
  /** har bo'lakning boshlanish vaqti, sekund */
  offsets: number[];
};

export const NARRATION_AUDIO: Record<string, Record<number, AudioSegment>> = {
%s,
};
''' % (DECK, URL_BASE, body)
    open(OUT_TS, "w", encoding="utf-8").write(ts)
    print(f"\n{os.path.relpath(OUT_TS, ROOT)} yangilandi")


def main() -> None:
    global FFMPEG
    ap = argparse.ArgumentParser()
    ap.add_argument("--deck", choices=sorted(DECKS), default="product", help="qaysi taqdimot uchun ovoz")
    ap.add_argument("--api", default=os.environ.get("TTS_API", API_DEFAULT))
    ap.add_argument("--lang", choices=["uz", "en"], action="append")
    ap.add_argument("--force", action="store_true", help="keshni e'tiborsiz qoldirib qayta generatsiya qilish")
    ap.add_argument("--timeout", type=int, default=300)
    a = ap.parse_args()

    select_deck(a.deck)
    FFMPEG = ffmpeg_exe()
    langs = a.lang or ["uz", "en"]
    print(f"Taqdimot: {a.deck} → {URL_BASE}\nTTS: {a.api}\nffmpeg: {FFMPEG}\n")

    out: dict[str, dict[int, dict]] = {}
    for lang in langs:
        print(f"{lang.upper()} — {ENDPOINT[lang]}")
        out[lang] = build_lang(a.api, lang, a.force, a.timeout)

    # Faqat bitta til generatsiya qilinsa, ikkinchisi manifestda qolsin
    for lang in ("uz", "en"):
        if lang in out:
            continue
        if not os.path.isdir(CACHE):
            continue
        keep: dict[int, dict] = {}
        for fn in sorted(os.listdir(CACHE)):
            if not fn.startswith(f"{lang}-slayd-") or not fn.endswith(".json"):
                continue
            si = int(fn[len(f"{lang}-slayd-") : len(f"{lang}-slayd-") + 2])
            meta = json.load(open(os.path.join(CACHE, fn), encoding="utf-8"))
            mp3 = f"slayd-{si:02d}.mp3"
            if not os.path.exists(os.path.join(OUT_AUDIO, lang, mp3)):
                continue
            keep[si] = {"file": f"{URL_BASE}/{lang}/{mp3}", "duration": meta["duration"], "offsets": meta["offsets"]}
        if keep:
            out[lang] = keep

    write_ts(out)


if __name__ == "__main__":
    main()
