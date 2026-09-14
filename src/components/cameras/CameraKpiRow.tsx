"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bell, CaretRight, type Icon, SecurityCamera, ShieldWarning, UserFocus } from "@phosphor-icons/react";
import { useDetections } from "@/hooks/useDetections";
import { useTodayArrivals } from "@/hooks/useTodayArrivals";
import { TodayArrivalsModal } from "@/components/people/TodayArrivalsModal";
import { useAppStore } from "@/store/useAppStore";
import type { CameraOut } from "@/lib/api";

/**
 * Kameralar sahifasining KPI qatori.
 *
 * ⚠️ Ilgari bu yerda `StatsCards` turardi — muassasa/talaba/o'qituvchi
 * sonlari, ya'ni KAMERALARGA umuman aloqasi yo'q ko'rsatkichlar (va ularning
 * yarmi to'qilgan edi). O'sha sonlar Dashboard va Statistika bo'limlarida
 * o'z joyida turibdi.
 *
 * Bu yerdagi to'rttasi — SHU sahifaga tegishli va HAMMASI haqiqiy manbadan:
 * kanallar ro'yxati (`useNvrChannels` → `cameras` propi) va aniqlash oqimi
 * (`useDetections`).
 */
export function CameraKpiRow({ cameras }: { cameras: CameraOut[] }) {
  // Bugungi hodisalar — "Aniqlanganlar" bo'limi bilan AYNI manba
  const today = useDetections({ category: "all", limit: 100, last24h: true });
  /* ⚠️ "Bugun kelganlar" ILGARI `useDetectionCameras()` dan olinardi, u esa
     faqat OXIRGI 100 hodisani so'raydi — panel 56 ta odam ko'rsatardi,
     kun davomida esa 640 ta turli shaxs o'tgan edi (2026-09-02 da
     o'lchandi). Endi kun BUTUNLAY o'qiladi (`useTodayArrivals`). */
  const arrivals = useTodayArrivals();
  const [showArrivals, setShowArrivals] = useState(false);
  const setActivePage = useAppStore((s) => s.setActivePage);

  const items = useMemo(() => {
    const total = cameras.length;
    const online = cameras.filter((c) => c.is_active).length;
    const events = today.events.length;
    // "Real vaqt xabarlari" — e'tibor talab qiladigan hodisalar (qurol,
    // janjal yoki serverning `alert` bayrog'i). Oddiy yuz qaydi emas.
    const alerts = today.events.filter((e) => e.alert || e.category === "gun" || e.category === "janjal").length;
    const people = arrivals.people;

    /* Har bir kartochka O'ZIGA tegishli sahifani ochadi. Kamera sonlari shu
       sahifada qoladi (ular allaqachon shu yerdagi ro'yxat), hodisa sonlari
       esa "Aniqlanganlar" va "Hodisalar" bo'limlariga olib boradi. */
    const rows: {
      Icon: Icon;
      value: number;
      label: string;
      tone: string;
      hint: string;
      page?: string;
      goHint?: string;
      /** Sahifaga o'tish o'rniga oyna ochadi. */
      modal?: boolean;
    }[] = [
      {
        Icon: SecurityCamera,
        value: total,
        label: "Jami kameralar",
        tone: "#22B8E6",
        hint: `${online} tasi onlayn`,
      },
      {
        /* ⚠️ "Faol translatsiya" OLIB TASHLANDI — u "Jami kameralar" bilan
           deyarli doim bir xil son berardi (32/32) va kartochka bo'sh
           takror edi. O'rniga ANIQLANGAN ODAMLAR: takrorsiz `face_id`
           lar soni — kameralar sahifasi uchun ma'noli ko'rsatkich. */
        Icon: UserFocus,
        value: people,
        label: "Bugun kelganlar",
        tone: "#22C55E",
        hint: arrivals.isLoading
          ? "sanalmoqda…"
          : people > 0
            ? `${arrivals.events} qayd${arrivals.capped ? " (qisman)" : ""}`
            : "hali hech kim qayd etilmadi",
        modal: true,
        goHint: "Bugun kelganlar ro'yxatini ochish",
      },
      {
        Icon: ShieldWarning,
        value: events,
        label: "Aniqlangan voqealar",
        tone: "#F59E0B",
        hint: "so'nggi 24 soat",
        page: "Aniqlanganlar",
        goHint: "Aniqlanganlar bo'limini ochish",
      },
      {
        Icon: Bell,
        value: alerts,
        label: "Real vaqt xabarlari",
        tone: "#F43F5E",
        hint: alerts > 0 ? "e'tibor talab qiladi" : "trevoga yo'q",
        page: "Hodisalar",
        goHint: "Hodisalar bo'limini ochish",
      },
    ];
    return rows;
  }, [cameras, today.events, arrivals]);

  return (
    <div className="grid grid-cols-4 gap-2.5">
      {items.map((it, i) => {
        const body = (
          <>
            {/* Katta "suv belgisi" ikonka — o'ng chetda, matn ostiga tushmaydi */}
            <it.Icon size={58} weight="fill" className="cam-kpi-ghost" />

            <span className="cam-kpi-chip">
              <it.Icon size={18} weight="fill" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="cam-kpi-num">{it.value}</span>
              <span className="cam-kpi-label">{it.label}</span>
              <span className="cam-kpi-hint">{it.hint}</span>
            </span>

            {/* Bosiladigan kartochkada — o'tish strelkasi */}
            {(it.page || it.modal) && <CaretRight size={14} weight="bold" className="cam-kpi-go" />}
          </>
        );

        return (
          <motion.div
            key={it.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.4, ease: "easeOut" }}
            style={{ ["--c" as string]: it.tone }}
          >
            {it.modal ? (
              <button type="button" onClick={() => setShowArrivals(true)} title={it.goHint} className="cam-kpi is-link">
                {body}
              </button>
            ) : it.page ? (
              <button type="button" onClick={() => setActivePage(it.page!)} title={it.goHint} className="cam-kpi is-link">
                {body}
              </button>
            ) : (
              <div className="cam-kpi">{body}</div>
            )}
          </motion.div>
        );
      })}
      {showArrivals && (
        <TodayArrivalsModal onClose={() => setShowArrivals(false)} />
      )}
    </div>
  );
}
