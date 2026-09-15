#!/usr/bin/env python3
"""
Taqdimot ssenariysini bitta faylga chiqaradi (o'zbekcha + inglizcha).

Manba — `copy/uz.ts` va `copy/en.ts`: taqdimotda AYNAN shu matn o'qiladi,
shuning uchun ssenariy hech qachon kod bilan ajralib qolmaydi. Vaqtlar
`narrationAudio.ts` dagi O'LCHANGAN qiymatlardan olinadi (ovoz bo'lsa).

Ishlatish:
    python3 tools/export-script.py                    # → TAQDIMOT-SSENARIY.md
    python3 tools/export-script.py --deck investor    # → INVESTOR-SSENARIY.md
    python3 tools/export-script.py --out x.md
"""

import argparse
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# Ikkita taqdimot — `tools/build-narration.py` dagi ro'yxat bilan bir xil
DECKS = {
    "product": {
        "dir": ("src", "components", "presentation"),
        "title": "Campus AI — mahsulot taqdimoti ssenariysi",
        "out": "TAQDIMOT-SSENARIY.md",
    },
    "investor": {
        "dir": ("src", "components", "investor"),
        "title": "Campus AI — investor taqdimoti ssenariysi",
        "out": "INVESTOR-SSENARIY.md",
    },
}

COPY = ""
AUDIO_TS = ""

CUE_RE = re.compile(r'\{\s*at:\s*([\d.]+)\s*,\s*text:\s*"((?:[^"\\]|\\.)*)"\s*\}')
TITLES_RE = re.compile(r"slideTitles:\s*\[(.*?)\]", re.S)
STR_RE = re.compile(r'"((?:[^"\\]|\\.)*)"')


def unescape(s: str) -> str:
    return s.replace('\\"', '"').replace("\\\\", "\\").replace("\\n", "\n")


def read_copy(lang: str):
    """`narration` (slaydlar bo'yicha cue'lar) va `slideTitles` ni o'qiydi."""
    src = open(os.path.join(COPY, f"{lang}.ts"), encoding="utf-8").read()

    titles = [unescape(m.group(1)) for m in STR_RE.finditer(TITLES_RE.search(src).group(1))]

    i = src.index("[", src.index("narration: ["))
    depth = 0
    cur = i
    slides = []
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
                slides.append([(float(m.group(1)), unescape(m.group(2))) for m in CUE_RE.finditer(block)])
            elif depth == 0:
                break
    return titles, slides


def read_audio():
    """Generatsiya qilingan manifestdan o'lchangan vaqtlar."""
    if not os.path.exists(AUDIO_TS):
        return {}
    src = open(AUDIO_TS, encoding="utf-8").read()
    out: dict[str, dict[int, dict]] = {}
    for lang in ("uz", "en"):
        m = re.search(rf"\n  {lang}: \{{(.*?)\n  \}}", src, re.S)
        if not m:
            continue
        rows = {}
        for r in re.finditer(r"(\d+): \{ file: \"[^\"]+\", duration: ([\d.]+), offsets: \[([^\]]*)\] \}", m.group(1)):
            rows[int(r.group(1))] = {
                "duration": float(r.group(2)),
                "offsets": [float(x) for x in r.group(3).split(",") if x.strip()],
            }
        out[lang] = rows
    return out


def mmss(sec: float) -> str:
    return f"{int(sec) // 60}:{int(sec) % 60:02d}"


def main() -> None:
    global COPY, AUDIO_TS
    ap = argparse.ArgumentParser()
    ap.add_argument("--deck", choices=sorted(DECKS), default="product", help="qaysi taqdimot ssenariysi")
    ap.add_argument("--out", help="chiqish fayli (standart — taqdimotga qarab)")
    a = ap.parse_args()

    deck = DECKS[a.deck]
    base = os.path.join(ROOT, *deck["dir"])
    COPY = os.path.join(base, "copy")
    AUDIO_TS = os.path.join(base, "narrationAudio.ts")
    out_path = a.out or os.path.join(ROOT, deck["out"])
    src_rel = os.path.relpath(COPY, ROOT).replace(os.sep, "/")

    uz_titles, uz = read_copy("uz")
    en_titles, en = read_copy("en")
    if len(uz) != len(en):
        sys.exit(f"Slaydlar soni mos emas: uz={len(uz)} en={len(en)}")

    audio = read_audio()

    def times(lang: str, si: int, n: int):
        row = audio.get(lang, {}).get(si)
        if row and len(row["offsets"]) == n:
            return row["offsets"], row["duration"]
        return None, None

    total_uz = sum((audio.get("uz", {}).get(i, {}).get("duration") or 0) for i in range(len(uz)))
    total_en = sum((audio.get("en", {}).get(i, {}).get("duration") or 0) for i in range(len(en)))

    out = [
        f"# {deck['title']}",
        "",
        f"> **AVTOMATIK CHIQARILGAN:** `python3 tools/export-script.py --deck {a.deck}`",
        f"> Manba — `{src_rel}/uz.ts` va `{src_rel}/en.ts`.",
        "> Bu faylni tahrirlash mumkin emas: matnni o'sha fayllarda o'zgartiring,",
        f"> so'ng ovozni qayta generatsiya qiling (`tools/build-narration.py --deck {a.deck}`).",
        "",
        "Ovoz — **taqdimotchi ovozi**: mahsulot biz nomimizdan tanishtiriladi, tizim",
        "uchinchi shaxsda tilga olinadi. AI o'zi haqida birinchi shaxsda gapirmaydi.",
        "",
        f"**Slaydlar:** {len(uz)} ta · "
        f"**Umumiy ovoz:** o'zbekcha ≈ {mmss(total_uz)}, inglizcha ≈ {mmss(total_en)}",
        "",
        "Vaqtlar — ovoz faylidan **o'lchangan** qiymatlar (segment boshidan).",
        "",
        "---",
        "",
    ]

    for si in range(len(uz)):
        uz_off, uz_dur = times("uz", si, len(uz[si]))
        en_off, en_dur = times("en", si, len(en[si]))
        dur = f" · o'zbekcha {uz_dur:.0f}s · inglizcha {en_dur:.0f}s" if uz_dur and en_dur else ""
        out.append(f"## {si + 1}. {uz_titles[si]} · {en_titles[si]}{dur}")
        out.append("")
        out.append("| # | ⏱ | O'zbekcha | English |")
        out.append("|---|---|---|---|")
        for ci in range(max(len(uz[si]), len(en[si]))):
            u = uz[si][ci][1] if ci < len(uz[si]) else ""
            e = en[si][ci][1] if ci < len(en[si]) else ""
            t = f"{uz_off[ci]:.1f}s" if uz_off and ci < len(uz_off) else f"{uz[si][ci][0]:.1f}s*"
            out.append(f"| {ci + 1} | {t} | {u.replace('|', '\\|')} | {e.replace('|', '\\|')} |")
        out.append("")

    # Taqdimotchi varaqasi — zalda o'qish uchun
    out += [
        "---",
        "",
        "## Taqdimotchi varaqasi — o'zbekcha",
        "",
        "Zalda o'qish uchun. Har slaydning yonida **jamlangan vaqt** turibdi:",
        "o'sha daqiqada shu slaydda bo'lishingiz kerak.",
        "",
        "Ovozni o'chirib (`M`) o'zingiz o'qiysiz — subtitr va animatsiya",
        "o'sha jadval bo'yicha ketaveradi. `Space` — pauza.",
        "",
    ]
    run = 0.0
    for si in range(len(uz)):
        _, uz_dur = times("uz", si, len(uz[si]))
        stamp = f"`{mmss(run)}`" if uz_dur else ""
        length = f" · {uz_dur:.0f}s" if uz_dur else ""
        out.append(f"### {si + 1}. {uz_titles[si]} {stamp}{length}")
        out.append("")
        out.append(" ".join(txt for _, txt in uz[si]))
        out.append("")
        run += uz_dur or 0

    out += [
        "---",
        "",
        "## Presenter script — English",
        "",
    ]
    run = 0.0
    for si in range(len(en)):
        _, en_dur = times("en", si, len(en[si]))
        stamp = f"`{mmss(run)}`" if en_dur else ""
        length = f" · {en_dur:.0f}s" if en_dur else ""
        out.append(f"### {si + 1}. {en_titles[si]} {stamp}{length}")
        out.append("")
        out.append(" ".join(txt for _, txt in en[si]))
        out.append("")
        run += en_dur or 0

    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(out))
    print(f"{os.path.relpath(out_path, ROOT)} — {len(uz)} slayd, {os.path.getsize(out_path)} bayt")


if __name__ == "__main__":
    main()
