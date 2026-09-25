import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import LegalPage from "@/components/support/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("terms") };
}

export default function TermsPage() {
  return <LegalPage doc="terms" />;
}
