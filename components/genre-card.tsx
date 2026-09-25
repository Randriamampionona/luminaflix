import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { GenreWithStats } from "@/action/get-genres.action";
import { tmdbImage } from "@/lib/media";

export default async function GenreCard({ genre }: { genre: GenreWithStats }) {
  const t = await getTranslations("media");
  const poster = tmdbImage(genre.poster);

  return (
    <Link
      href={`/genres/${genre.id}`}
      className="group relative block h-28 overflow-hidden rounded-md border border-white/5 bg-zinc-900/40 transition-colors duration-500 hover:bg-cyan-600 focus-visible:outline-2 focus-visible:outline-cyan-500"
    >
      <div className="relative z-10 flex h-full flex-col justify-center p-5">
        <h3 className="line-clamp-1 text-xl font-black uppercase italic tracking-tight text-white transition-transform duration-300 group-hover:translate-x-1">
          {genre.name}
        </h3>
        <p className="mt-1 text-[11px] font-bold text-zinc-400 group-hover:text-white/90">
          {t("genreTitles", { count: genre.count })}
        </p>
      </div>

      {poster && (
        <div className="absolute -bottom-2 -right-2 h-28 w-20 transition-all duration-500 group-hover:-bottom-4 group-hover:right-2">
          <div className="relative h-full w-full rotate-12 shadow-2xl transition-transform duration-500 group-hover:rotate-0">
            <Image
              src={poster}
              alt=""
              fill
              sizes="80px"
              className="rounded-lg border border-white/10 object-cover opacity-50 transition-opacity group-hover:opacity-100"
            />
          </div>
        </div>
      )}
    </Link>
  );
}
