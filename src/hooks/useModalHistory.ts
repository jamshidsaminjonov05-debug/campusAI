"use client";

import { useEffect, useRef } from "react";
import { closeModalLayer, openModalLayer } from "@/lib/modalHistory";

/**
 * Oynani brauzerning "◀ orqaga" tugmasiga bog'laydi.
 *
 * Oyna komponentining ICHIDA, eng yuqorida chaqiriladi:
 *
 * ```tsx
 * export function TodayArrivalsModal({ onClose }) {
 *   useModalHistory(onClose);
 *   ...
 * ```
 *
 * Ko'pchilik oynamiz FAQAT ochiq bo'lganda mount qilinadi
 * (`{open && <Modal …/>}`), shuning uchun "mount = ochildi,
 * unmount = yopildi" qoidasi yetarli. Shartli ochiladiganlari uchun
 * `enabled` bor (hook'ni shart ichida chaqirib bo'lmaydi).
 *
 * ⚠️ `onClose` **`false` qaytarsa** oyna yopilmaydi va tarix yozuvi qayta
 * qo'yiladi — formada saqlanmagan ma'lumot bo'lganda tasdiq so'rash uchun
 * (`PersonFormModal`).
 *
 * ⚠️ **`onClose` REF orqali o'qiladi.** Chaqiruvchilar odatda uni
 * `() => setOpen(false)` deb JOYIDA yozadi, ya'ni har renderda YANGI
 * funksiya bo'ladi. To'g'ridan-to'g'ri `useEffect` dep'iga qo'yilsa
 * effekt har renderda qayta ishga tushib, tarixga yangi yozuv qo'shib
 * yuborardi.
 */
export function useModalHistory(onClose: () => void | boolean, enabled = true): void {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!enabled) return;
    const id = openModalLayer(() => closeRef.current());
    return () => closeModalLayer(id);
  }, [enabled]);
}
