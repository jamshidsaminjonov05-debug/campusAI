/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  YUZ BAZASI — `/nvr/people` (`FRONTEND.md` 10-bo'lim)                ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Kamera odamni TANISHI uchun u shu bazada bo'lishi kerak. Bu — kuzatuv
 * postining O'Z ro'yxati (`NvrPerson`, `id` — number), backend'dagi
 * `Person` (`/persons`, `id` — UUID) bilan ARALASHTIRILMAYDI: ikkalasi
 * har xil hayot davri va har xil tizimda.
 */
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createNvrPerson,
  deleteNvrPerson,
  listClasses,
  listPeople,
  updateNvrPerson,
  type NvrPerson,
  type NvrPersonPayload,
  type NvrPersonRole,
} from "@/lib/nvrApi";

export function useNvrPeople(
  q: { role?: NvrPersonRole; search?: string; klass?: string; limit?: number; offset?: number } = {}
) {
  return useQuery({
    queryKey: ["nvr-people", q],
    queryFn: () => listPeople(q),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useNvrPeopleMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["nvr-people"] });

  const create = useMutation({
    mutationFn: ({ data, image }: { data: NvrPersonPayload; image?: File | null }) =>
      createNvrPerson(data, image),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<NvrPersonPayload> }) => updateNvrPerson(id, data),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteNvrPerson(id),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

/* 🔴 `useFacelibPhotos()` O'CHIRILDI (2026-09-04) — u qurilmaning xom
   `pic_url` ini (ichki IP, bizning serverimiz ko'rmaydi) relay orqali
   olib kelishga urinardi va HAR BIR RASM 10.4 soniya osilib turardi;
   sayt aynan shundan qotardi. O'rniga — `nvrPersonPhotoUrl(id)`
   (`lib/nvrApi.ts`): rasmni kuzatuv posti serverining O'ZI beradi, batafsil izoh
   o'sha faylda. */

/**
 * BUTUN yuz bazasi, `id → NvrPerson` xaritasi.
 *
 * NEGA KERAK: `NvrFaceRow.person` (`useFaces()`, "Hammasi" ro'yxati)
 * faqat `{id, full_name, role, role_label}` beradi — SINF/GURUH
 * (`note`) yo'q. `id` esa AYNI shu ro'yxatdagi `NvrPerson.id` bilan bir
 * xil (ikkalasi ham kuzatuv postining o'z tizimi, aniq FK BOR — bu
 * `FaceHistoryModalByName`dagi ism bo'yicha taxminiy qidiruvdan farqli).
 */
export function useNvrPeopleMap() {
  const q = useQuery({
    queryKey: ["nvr-people-map"],
    queryFn: async () => {
      const out: NvrPerson[] = [];
      let offset = 0;
      for (let page = 0; page < 10; page++) {
        const res = await listPeople({ limit: 200, offset });
        out.push(...res.people);
        offset += res.people.length;
        if (res.people.length === 0 || offset >= res.total) break;
      }
      return out;
    },
    staleTime: 60_000,
  });

  return useMemo(() => new Map((q.data ?? []).map((p) => [p.id, p])), [q.data]);
}

/**
 * SINFLAR RO'YXATI — `GET /nvr/classes`.
 *
 * ⚠️ Klientda `note` maydonidan YIG'ILMAYDI: serverning o'z ro'yxatida
 * hali kamerada ko'rinmagan sinf ham bo'ladi va har birida nechta odam
 * borligi tayyor keladi (o'lchandi 2026-09-04: 14 sinf + `Uqituvchilar`,
 * 847 bayt / 22 ms).
 */
export function useNvrClasses() {
  return useQuery({
    queryKey: ["nvr-classes"],
    queryFn: listClasses,
    staleTime: 5 * 60_000,
  });
}
