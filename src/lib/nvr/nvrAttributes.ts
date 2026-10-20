/**
 * kuzatuv posti yuz belgilarini (`attributes`) o'qiladigan matnga aylantirish.
 *
 * Server ularni XOM ko'rinishda beradi: `{ "gender": "male", "mask": "no",
 * "glass": "unknown" }`. Ilgari UI shu kalit va qiymatlarni shundoq
 * ko'rsatardi — foydalanuvchi "glass: unknown" degan yozuvni ko'rardi.
 *
 * Kalit ro'yxatda bo'lmasa xom qiymat qaytadi (server yangi belgi qo'shsa
 * ekran buzilmasin) — shuning uchun bu yerda `Record<string, string>`.
 */
import { tr } from "@/i18n";

export function attrLabel(key: string): string {
  const dict = tr().nvr.dossier.attrs as Record<string, string>;
  return dict[key.toLowerCase()] ?? key;
}

export function attrValue(value: string): string {
  const dict = tr().nvr.dossier.attrValues as Record<string, string>;
  return dict[String(value).toLowerCase()] ?? value;
}
