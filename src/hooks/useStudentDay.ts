/**
 * Bir kunlik o'quvchi ma'lumoti — statistika, harakat va kayfiyat
 * bo'limlari uchun YAGONA manba.
 *
 * NEGA bitta hook: uchala ko'rinish ham bir xil kun kesimini so'raydi. Alohida
 * so'rov yozilsa React Query keshi bo'linib ketardi va bir sahifada bir xil
 * ma'lumot ikki-uch marta so'ralardi. Endi so'rov kaliti bitta — tafsilot
 * paneli statistikaning keshidan foydalanadi.
 *
 * ⚠️ **ZAXIRA (MOCK) OLIB TASHLANDI** (2026-09-05). Ilgari backend bo'sh
 * bo'lsa `lib/demoAttendance.ts` mock odamlardan davomat YASARDI va
 * ekranda haqiqiy bo'lmagan ismlar turardi. Endi backend nima bersa
 * O'SHA ko'rsatiladi; bo'sh bo'lsa panel buni OCHIQ yozadi.
 */
import { useMemo } from "react";
import { useAllAttendance, useAllPersons, useCameras } from "@/hooks/useApi";
import type { AttendanceOut, PersonOut, PersonType } from "@/lib/api";

/* ⚠️ `ALL_PAGE_SIZE = 500` OLIB TASHLANDI: server `page_size` ni 200 dan
   keyin `422` bilan rad etadi (o'lchandi — `lib/api.ts` chegaralari), ya'ni
   bu so'rov HAR DOIM yiqilardi va toifa tabi bo'sh turardi. Endi
   `useAllPersons()` sahifalarni o'zi aylanib chiqadi. */

/** Backend "to'lgan" deb hisoblanishi uchun kamida shuncha shaxs bo'lsin.
 *  Bir-ikkita sinov yozuvi bilan davomat statistikasi ma'nosiz chiqadi. */
const MIN_REAL_PERSONS = 5;

/** `YYYY-MM-DD` — `<input type="date">` va backend `date_from` shu formatda. */
export function isoDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface StudentDay {
  persons: PersonOut[];
  records: AttendanceOut[];
  /** `camera_id` → odam o'qiydigan nom. */
  cameraName: (id: string | null) => string | null;
  /** Ma'lumot real backend'danmi. */
  live: boolean;
  isLoading: boolean;
}

/**
 * Kun kesimi — shaxslar + o'sha kundagi davomat qaydlari.
 *
 * O'lchandi (2026-09-02, backend `<backend-server-ip>:7005`): `/persons` da
 * 2 o'quvchi, 1 o'qituvchi, 0 xodim; bugungi davomat qaydi yo'q. Aynan
 * shu ko'rsatiladi — `live` bayrog'i chaqiruvchiga ma'lumot haqiqatan
 * kelgan-kelmaganini bildiradi.
 */
export function useStudentDay(personType: PersonType, date = isoDate()): StudentDay {
  const persons = useAllPersons({ person_type: personType, is_active: true });
  /* Bir kunda 1 000 shaxs kirish/chiqishi 1 000 yozuvdan oshishi mumkin —
     sahifalanadigan variant (`useAllAttendance`) ishlatiladi. */
  const attendance = useAllAttendance({ date_from: date, date_to: date }, { live: true });
  const cameras = useCameras();

  return useMemo(() => {
    const realPersons = persons.data?.items ?? [];
    const realRecords = attendance.data ?? [];
    const live = realPersons.length >= MIN_REAL_PERSONS || realRecords.length > 0;
    const map = new Map(
      (cameras.data ?? []).map((c) => [c.id, c.location ? `${c.name} · ${c.location}` : c.name])
    );
    const cameraName = (id: string | null) => (id ? map.get(id) ?? null : null);

    return {
      persons: realPersons,
      records: realRecords,
      cameraName,
      live,
      isLoading: persons.isLoading || attendance.isLoading,
    };
  }, [
    persons.data,
    persons.isLoading,
    attendance.data,
    attendance.isLoading,
    cameras.data,
  ]);
}
