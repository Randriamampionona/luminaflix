import { auth } from "@clerk/nextjs/server";
import { LogIn, ServerOff } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import SignInLink from "@/components/auth/sign-in-link";
import MyUploads from "@/components/community/my-uploads";
import UploadForm from "@/components/community/upload-form";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { doodConfigured } from "@/lib/community/doodstream";
import { getUploaderCommunity } from "@/lib/community/server";

const MAX_GB = Math.round(((Number(process.env.COMMUNITY_MAX_UPLOAD_MB) || 4096) / 1024) * 10) / 10;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("communityUpload"), robots: { index: false } };
}

/** /community/upload — signed-in members only. */
export default async function CommunityUploadPage() {
  const [{ userId }, t] = await Promise.all([auth(), getTranslations("community.upload")]);
  const mine = userId ? await getUploaderCommunity(userId) : [];

  return (
    <PageShell>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} accent={t("accent")} description={t("intro")} />
      {!userId ? (
        <div className="mx-auto max-w-lg space-y-4 rounded-3xl border border-line bg-surface p-8 text-center">
          <LogIn className="mx-auto h-10 w-10 text-brand" aria-hidden />
          <h2 className="text-xl font-black text-foreground">{t("signInTitle")}</h2>
          <p className="text-sm text-fg-muted">{t("signInBody")}</p>
          <SignInLink className="inline-flex rounded-2xl bg-cyan-500 px-6 py-3 text-xs font-black tracking-widest text-black uppercase hover:bg-cyan-400">
            {t("signIn")}
          </SignInLink>
        </div>
      ) : !doodConfigured() ? (
        <p className="mx-auto flex max-w-lg items-center gap-3 rounded-3xl border border-amber-500/40 bg-amber-500/10 p-6 text-sm text-fg-soft">
          <ServerOff className="h-5 w-5 shrink-0 text-amber-500" aria-hidden />
          {t("notConfigured")}
        </p>
      ) : (
        <>
          <MyUploads videos={mine} />
          <UploadForm maxGb={MAX_GB} />
        </>
      )}
    </PageShell>
  );
}
