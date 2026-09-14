/**
 * kuzatuv posti proxy sessiya cookie'sining nomi — bitta joyda.
 *
 * `app/session/route.ts` (qo'yadi/o'chiradi) va `app/nvr/[...path]/route.ts`
 * (tekshiradi) ikkalasi ham shu yerdan oladi. Next.js Route Handler fayllari
 * FAQAT HTTP metod eksportlariga ruxsat beradi (`POST`, `DELETE`, ...) —
 * boshqa nom eksport qilinsa build turi tekshiruvi (`.next/types`) yiqiladi,
 * shuning uchun konstanta alohida, oddiy modulda turadi.
 */
export const SESSION_COOKIE = "campus-session";
