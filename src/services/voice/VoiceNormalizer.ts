/**
 * VoiceNormalizer — STT natijasini tozalaydi va keng tarqalgan xatolarni tuzatadi.
 *
 * Bosqichlar: kirill→lotin, apostrof birxillashtirish, tinish/ortiqcha probel,
 * so'z darajasidagi tuzatish lug'ati (ut→o't, tehnikum→texnikum...), ko'p so'zli
 * tuzatishlar (geoanalitika→geo analitika). `stem()` — moslashtirish uchun
 * o'zbekcha qo'shimchalarni (‑ni, ‑lar, ‑ga...) kesadi.
 */

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "x", ц: "ts", ч: "ch", ш: "sh", щ: "sh",
  ъ: "'", ы: "i", ь: "", э: "e", ю: "yu", я: "ya", ў: "o'", қ: "q", ғ: "g'", ҳ: "h",
};

/** Ko'p so'zli / yopishib qolgan xatolar — butun matnda almashtiriladi. */
const PHRASE_FIXES: [RegExp, string][] = [
  [/geo\s*analit[iy]ka/g, "geo analitika"],
  [/bosh\s*qaruv/g, "boshqaruv"],
  [/to'?liq\s*ekran/g, "to'liq ekran"],
];

/** So'z darajasidagi tuzatishlar (STT ko'p adashadigan shakllar). */
const WORD_FIXES: Record<string, string> = {
  ut: "o't",
  tehnikum: "texnikum",
  texnikm: "texnikum",
  teknikum: "texnikum",
  tehnkum: "texnikum",
  kamira: "kamera",
  kamerala: "kameralar",
  kameralarni: "kameralar",
  kameran: "kamera",
  davomatni: "davomat",
  talabani: "talaba",
  talabalarni: "talabalar",
  oqituvchi: "o'qituvchi",
  hodisalarni: "hodisalar",
  hodisani: "hodisa",
  sozlamalarni: "sozlamalar",
  masshtabni: "masshtab",
  xaritani: "xarita",
  janjallarni: "janjal",
  chekishni: "chekish",
  hisobotni: "hisobot",
  hisobotlarni: "hisobotlar",
};

/** O'zbekcha qo'shimchalar — moslashtirishда kesiladi (uzunroqlari avval). */
const SUFFIXES = ["larni", "larga", "lardan", "larda", " larim", "ning", "lar", "ni", "ga", "da", "dan", "ini", "si", "im", "yu"];

export function cyrillicToLatin(text: string): string {
  let out = "";
  for (const ch of text) out += CYRILLIC_TO_LATIN[ch] ?? ch;
  return out;
}

/** To'liq normallash — pastki registr, translit, apostrof, tinish, probel, tuzatishlar. */
export function normalizeTranscript(raw: string): string {
  let t = cyrillicToLatin(raw.toLowerCase());
  t = t.replace(/[''`ʻʼ]/g, "'");
  t = t.replace(/[.,!?;:"()]/g, " ");
  for (const [re, rep] of PHRASE_FIXES) t = t.replace(re, rep);
  t = t.replace(/\s+/g, " ").trim();

  const fixed = t
    .split(" ")
    .map((w) => WORD_FIXES[w] ?? w)
    .join(" ");
  return fixed;
}

/** So'zdan qo'shimchani kesib "o'zak"ni qaytaradi (moslashtirish uchun). */
export function stem(word: string): string {
  let w = word;
  for (const suf of SUFFIXES) {
    if (w.length > suf.length + 2 && w.endsWith(suf)) {
      w = w.slice(0, -suf.length);
      break;
    }
  }
  return w;
}

export function tokens(text: string): string[] {
  return text.split(" ").filter(Boolean);
}
