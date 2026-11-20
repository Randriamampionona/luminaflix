import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PageAd from "@/components/ads/page-ad";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import JsonLd from "@/components/seo/json-ld";
import DownloadTutorial, {
  type TutorialMethod,
  type TutorialStep,
  type TutorialTexts,
} from "@/components/tutorial/download-tutorial";
import { SITE_URL } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("downloadTutorial");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/download-tutorial" },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      images: [{ url: "/tutorials/download-tutorial-poster.webp", width: 1280, height: 720 }],
      videos: [{ url: "/tutorials/download-tutorial.mp4", width: 1920, height: 1080, type: "video/mp4" }],
    },
  };
}

/** /download-tutorial — how to download a movie: video, chapters and illustrated steps. */
export default async function DownloadTutorialPage() {
  const t = await getTranslations("downloadTutorial");
  const steps = t.raw("steps") as TutorialStep[];
  const methods = t.raw("methods") as TutorialMethod[];
  const keys = [
    "watchVideo",
    "watchVideoSub",
    "readSteps",
    "videoTitle",
    "chapters",
    "adsTitle",
    "adsBody",
    "adsTip",
    "methodsTitle",
    "stepsTitle",
    "stepLabel",
    "watchStep",
    "finalTitle",
    "finalBody",
    "finalCta",
    "replay",
  ] as const;
  const texts = Object.fromEntries(keys.map((k) => [k, t.raw(k) as string])) as unknown as TutorialTexts;

  return (
    <PageShell>
      {/* Search engines: a HowTo with its video */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: t("metaTitle"),
          description: t("metaDescription"),
          image: `${SITE_URL}/tutorials/download-tutorial-poster.webp`,
          totalTime: "PT1M",
          video: {
            "@type": "VideoObject",
            name: texts.videoTitle,
            description: t("metaDescription"),
            thumbnailUrl: `${SITE_URL}/tutorials/download-tutorial-poster.webp`,
            contentUrl: `${SITE_URL}/tutorials/download-tutorial.mp4`,
            uploadDate: "2026-11-20",
            duration: "PT1M2S",
          },
          step: steps.map((s, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: s.title,
            text: s.body,
            image: `${SITE_URL}/tutorials/download/${s.image}.webp`,
            url: `${SITE_URL}/download-tutorial#steps`,
          })),
        }}
      />
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} accent={t("accent")} description={t("description")} />
      <DownloadTutorial steps={steps} methods={methods} texts={texts} />
      <PageAd />
    </PageShell>
  );
}
