/**
 * Trevoga signallarini AUDIO FAYL qilib yasaydi (`public/audio/`).
 *
 *   node tools/make-alert-audio.mjs
 *
 * NEGA fayl: ilgari ovoz brauzerda `OscillatorNode` bilan sintez qilinardi.
 * U ishlardi, lekin quruq va "raqamli" eshitilardi — cho'qqilari kesilib,
 * garmonikalari yo'q edi. ffmpeg esa to'lqinni to'liq aniqlikda hisoblab,
 * chegaralab (`alimiter`) va tenglashtirib (`highpass`/`lowpass`) beradi —
 * ovoz TINIQ va bir tekis chiqadi.
 *
 * OFFLINE qoidasi buzilmaydi: fayllar SHU YERDA yasaladi va `public/` da
 * turadi, hech qanday CDN yoki tashqi manba yo'q.
 *
 * ── SIRENA QANDAY QURILADI ────────────────────────────────────────────
 * Chastotasi o'zgaruvchan tonni to'g'ridan-to'g'ri `sin(2πf(t)t)` deb
 * yozib bo'lmaydi — bu noto'g'ri fazani beradi. To'g'risi: FAZANI
 * integrallash kerak. f(t) = f0 + A·sin(2π·fm·t) uchun
 *
 *     φ(t) = 2π·f0·t − (A/fm)·cos(2π·fm·t)
 *
 * Quyidagi ifodalar aynan shu formuladan.
 *
 * Talab: `ffmpeg` PATH da bo'lsin.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("public/audio");
fs.mkdirSync(OUT, { recursive: true });

/** Sirena fazasi — `f0` markaz, `A` tebranish, `fm` yugurish tezligi. */
const wail = (f0, A, fm) => `sin(2*PI*${f0}*t - (${A}/${fm})*cos(2*PI*${fm}*t))`;

const SOUNDS = [
  {
    file: "alert-alarm.mp3",
    seconds: 20,
    /* TREVOGA — 20 s, ikki tonli "vuu-vuu".
       · asosiy qatlam 1000 Hz atrofida ±380 Hz yuguradi (0.55 Hz — sekundiga
         taxminan bir yugurish, klassik sirena tezligi);
       · ikkinchi garmonika o'tkirlik beradi (quloq uni yaxshi ilg'aydi);
       · past qatlam (220 Hz) "og'irlik" qo'shadi, aks holda ovoz yupqa. */
    expr: `0.52*${wail(1000, 380, 0.55)} + 0.20*${wail(2000, 760, 0.55)} + 0.16*${wail(220, 60, 0.55)}`,
    // Karnaydan chiqmaydigan past guvillashni kesamiz, o'tkir chinqiroqni yumshatamiz
    filters: "highpass=f=140,lowpass=f=6000,alimiter=limit=0.95,volume=2.2",
  },
  {
    file: "alert-warn.mp3",
    seconds: 1.6,
    /* DIQQAT — takrorlanuvchi "din-don". ⚠️ `mod(t,0.4)` ISHLATILMAYDI:
       lavfi'da vergul filtr ajratgichi va ifodani buzadi. O'rniga
       `t - 0.4*floor(t/0.4)` — ayni natija, vergulsiz. */
    expr: `0.5*sin(2*PI*990*t)*exp(-6*(t-0.4*floor(t/0.4)))`,
    filters: "highpass=f=200,alimiter=limit=0.95,volume=2.0",
  },
  {
    file: "alert-info.mp3",
    seconds: 0.5,
    /* ODDIY QAYD — bitta yumshoq "blip". */
    expr: `0.45*sin(2*PI*740*t)*(exp(-9*t))`,
    filters: "highpass=f=200,alimiter=limit=0.95,volume=1.8",
  },
];

for (const s of SOUNDS) {
  const dest = path.join(OUT, s.file);
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `aevalsrc=${s.expr}:s=48000:d=${s.seconds}`,
      "-af",
      s.filters,
      "-c:a",
      "libmp3lame",
      "-b:a",
      "128k",
      "-ac",
      "1",
      dest,
    ],
    { stdio: ["ignore", "ignore", "inherit"] }
  );
  const kb = Math.round(fs.statSync(dest).size / 1024);
  console.log(`${s.file.padEnd(18)} ${s.seconds}s  ${kb}KB`);
}
console.log("\nTayyor. Fayllar: public/audio/");
