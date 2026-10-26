import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/nvr/nvrSession";

/**
 * Investor taqdimoti (`/investor`) va uning media fayllari —
 * faqat backend loginidan o'tgan brauzerga.
 *
 * Alohida login/parol YO'Q: panel bilan AYNI backend hisobi ishlatiladi
 * (`lib/api.ts` `api.login`). Muvaffaqiyatli login'dan keyin brauzerga
 * `campus-session` cookie qo'yiladi (`app/session/route.ts`) — `/nvr`
 * proxysi ham shu cookie'ni tekshiradi. Panelga allaqachon kirgan odamga
 * taqdimot qayta login so'ramasdan ochiladi.
 *
 * ⚠️ Media ham himoyalanadi: `public/` dagi fayl to'g'ridan-to'g'ri havola
 * bilan ochilardi — taqdimotdagi kadrlar (orasida o'quvchilar yuzi bor)
 * login'siz ko'rinib qolardi.
 */
export function middleware(req: NextRequest) {
  if (req.cookies.get(SESSION_COOKIE)?.value) return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  const isPage = pathname === "/investor";
  if (!isPage) return new NextResponse("Taqdimot uchun kirish talab qilinadi", { status: 401 });

  const url = req.nextUrl.clone();
  url.pathname = "/taqdimot-kirish";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/investor",
    "/imges/investor/:path*",
    "/video/investor/:path*",
    "/audio/investor/:path*",
  ],
};
