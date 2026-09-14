/**
 * GIF ikonkasining BOSHIDAN bo'sh (qimirlamaydigan) qismini qirqadi.
 *
 *   node tools/gif-trim.mjs <fayl|papka> [sekund]      # standart 1.5
 *   node tools/gif-trim.mjs public/icons/gif 1.5
 *   node tools/gif-trim.mjs public/icons/gif/detect/fire.gif
 *
 * NEGA kerak: lordicon eksportlari animatsiyadan OLDIN ~1.5 soniya qotib
 * turadi. Ikonka faqat hover/aktiv holatda o'ynagani uchun (`GifIcon`) o'sha
 * kutish sezilarli bo'ladi — sichqoncha tekkanda ikonka bir muddat "o'lik"
 * turadi. Boshini qirqsak animatsiya DARHOL boshlanadi.
 *
 * Shaffoflik saqlanadi: `palettegen=reserve_transparent` + `paletteuse`
 * `alpha_threshold` bilan (GIF'da alfa 1 bitli). Sifat pasaymasin uchun
 * palitra HAR FAYL uchun qaytadan quriladi — shu sabab hajm ham kichrayadi.
 *
 * Talab: `ffmpeg` PATH da bo'lsin.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [target, secRaw] = process.argv.slice(2);
if (!target) {
  console.error("Foydalanish: node tools/gif-trim.mjs <fayl|papka> [sekund]");
  process.exit(1);
}
const start = Number(secRaw ?? 1.5);
if (!Number.isFinite(start) || start <= 0) {
  console.error(`Noto'g'ri sekund: ${secRaw}`);
  process.exit(1);
}

const stat = fs.statSync(target);
const files = stat.isDirectory()
  ? fs
      .readdirSync(target)
      .filter((f) => f.toLowerCase().endsWith(".gif"))
      .map((f) => path.join(target, f))
  : [target];

if (files.length === 0) {
  console.error(`GIF topilmadi: ${target}`);
  process.exit(1);
}

const FILTER =
  `[0:v]trim=start=${start},setpts=PTS-STARTPTS,split[a][b];` +
  `[a]palettegen=reserve_transparent=1:stats_mode=diff[p];` +
  `[b][p]paletteuse=alpha_threshold=128`;

const duration = (f) =>
  Number(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], {
      encoding: "utf8",
    }).trim()
  );

for (const file of files) {
  const before = { size: fs.statSync(file).size, dur: duration(file) };
  if (before.dur <= start) {
    console.log(`${path.basename(file)}: ${before.dur}s — ${start}s dan qisqa, TEGILMADI`);
    continue;
  }

  const tmp = `${file}.trim.tmp.gif`;
  try {
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", file, "-filter_complex", FILTER, "-loop", "0", tmp]);
    fs.renameSync(tmp, file);
  } catch (e) {
    fs.rmSync(tmp, { force: true });
    console.error(`${path.basename(file)}: XATO — ${e.message}`);
    continue;
  }

  const after = { size: fs.statSync(file).size, dur: duration(file) };
  const kb = (n) => `${Math.round(n / 1024)}KB`;
  console.log(
    `${path.basename(file).padEnd(24)} ${before.dur}s → ${after.dur}s   ${kb(before.size)} → ${kb(after.size)}`
  );
}
