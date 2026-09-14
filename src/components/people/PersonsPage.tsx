"use client";

import { useState } from "react";
import { GraduationCap, IdentificationCard, UserCircle, Users, UsersFour } from "@phosphor-icons/react";
import type { PersonType } from "@/lib/api";
import { PeoplePage } from "./PeoplePage";
import { AllPeoplePage } from "./AllPeoplePage";
import { FaceDatabasePage } from "./FaceDatabasePage";
import { TabPill } from "@/components/common/panels";

type Tab = "all" | PersonType | "facedb";

const TABS: { id: Tab; label: string; Icon: typeof Users }[] = [
  { id: "all", label: "Hammasi", Icon: Users },
  { id: "teacher", label: "O'qituvchilar", Icon: GraduationCap },
  { id: "staff", label: "Xodimlar", Icon: IdentificationCard },
  { id: "student", label: "O'quvchilar", Icon: UsersFour },
  { id: "facedb", label: "Yuz bazasi", Icon: UserCircle },
];

/**
 * "Shaxslar" — beshta kesim, Statistikadagi kabi yuqori pilyula qatori.
 *
 * ⚠️ **"Bugungi davomat" va "Haftalik davomat dinamikasi" OLIB TASHLANDI**
 * (2026-09-06). `AttendanceBoard` Boshqaruv panelida ALLAQACHON bor
 * (bosilganda Statistikaning shu toifa tabiga o'tkazadi —
 * `setPersonTypeTarget`), shuning uchun bu yerda takrorlanishi ortiqcha
 * edi va foydalanuvchi so'ragan yangi ikkita bo'lim uchun joy bo'shatildi:
 * "Hamma odamlar" (`AllPeoplePage`) va "Yuz bazasi" (`FaceDatabasePage`):
 * ilgari bu ikkalasi UMUMAN yo'q edi, faqat ro'yxatga OLINGAN shaxslar
 * ko'rinardi — kamerada ko'ringan 3000+ NOTANISH odam va yuz bazasini
 * boshqarish (qo'shish/o'chirish) hech qayerda ko'rsatilmasdi.
 *
 * - **Hammasi** — kamerada ko'ringan HAR BIR odam, `AllPeoplePage`
 *   (`GET /api/v1/faces` — bazaga qo'shilgani ham, notanishi ham).
 * - **Yuz bazasi** — kuzatuv postining o'z ro'yxati (`FaceDatabasePage`,
 *   `/nvr/people`): qo'shish/o'chirish, "tayyor"/"rasm yo'q" belgisi.
 *
 * ⚠️ **"O'qituvchilar" / "O'quvchilar" ENDI HAM `FaceDatabasePage`GA
 * QARAYDI** (2026-09-04, "bitta APIga o'tamiz" so'ralgach) —
 * `<FaceDatabasePage lockedRole="teacher"|"student">`, rol pilyulasi
 * yashiringan holda. Ilgari ikkalasi ham backend `Person`ga (`PeoplePage`)
 * qarardi va ro'yxat DEYARLI BO'SH edi (o'lchandi: 2 o'quvchi,
 * 1 o'qituvchi) — foydalanuvchi "umuman chiqmayabdi" deb xabar berdi.
 * Kuzatuv postining o'z bazasida esa HAQIQIY odamlar bor.
 *
 * ⚠️ **"Xodimlar" ESKI YO'LDA QOLDI** (`PeoplePage`, backend `Person`) —
 * kuzatuv posti `NvrPersonRole`da FAQAT `student`/`teacher` bor, kuzatuv posti
 * "xodim" tushunchasini UMUMAN bilmaydi (`EnrollPerson.tsx`dan ham shu
 * sabab "Xodim" olib tashlangan edi). Bitta API'ga TO'LIQ o'tish bu
 * toifa uchun texnik jihatdan MUMKIN EMAS — o'ylab topilmadi.
 *
 * `activePage` id'si — hali ham **"Shaxslar"** (o'zgartirilmagan, butun
 * kodga bog'langan: ovozli buyruq, global qidiruv, dashboard kartochkasi).
 */
export function PersonsPage({ initialTab = "student" }: { initialTab?: PersonType }) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex-none">
        <div className="hik-glass-blue inline-flex flex-wrap gap-1 rounded-xl p-1">
          {TABS.map((x) => (
            <TabPill key={x.id} group="persons-tab" active={tab === x.id} onClick={() => setTab(x.id)} Icon={x.Icon}>
              {x.label}
            </TabPill>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {tab === "all" ? (
          <AllPeoplePage />
        ) : tab === "facedb" ? (
          <FaceDatabasePage />
        ) : tab === "teacher" || tab === "student" ? (
          <FaceDatabasePage key={tab} lockedRole={tab} />
        ) : (
          /* Faqat "Xodimlar" shu yo'ldan qoladi (yuqoridagi izohga qarang). */
          <PeoplePage key={tab} initialTab={tab} onTabChange={setTab} />
        )}
      </div>
    </div>
  );
}
