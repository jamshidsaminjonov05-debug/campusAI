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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createNvrPerson,
  deleteNvrPerson,
  listClasses,
  listPeople,
  updateNvrPerson,
  type NvrPersonPayload,
  type NvrPersonRole,
} from "@/lib/nvr/nvrApi";

export function useNvrPeople(
  q: { role?: NvrPersonRole; search?: string; klass?: string; limit?: number; offset?: number } = {},
  opts: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: ["nvr-people", q],
    queryFn: () => listPeople(q),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    enabled: opts.enabled ?? true,
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

/* `useNvrPeopleMap()` (BUTUN bazani 200 tadan sahifalab tortib `id → odam`
   xaritasi qurardi) 2026-10-26 da O'CHIRILDI — yagona chaqiruvchisi
   `AllPeoplePage` 2026-10-23 da o'chirilgan edi; `/people` so'rovi esa
   7–15 s (o'lchandi 2026-10-19), bunday to'liq skan qayta kerak bo'lsa
   serverdan `id` bo'yicha alohida so'rang. */

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
