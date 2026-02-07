"use client";

import Link, { LinkProps } from "next/link";
import { ReactNode, useMemo } from "react";
import { useSearchParams } from "next/navigation";

interface CustomLinkProps extends LinkProps {
  children: ReactNode;
  className?: string;
  target?: string;
  rel?: string;
}

export default function CustomLink({
  href,
  children,
  className,
  ...props
}: CustomLinkProps) {
  const searchParams = useSearchParams();

  // 1. Get the current lang directly from the active URL
  // We default to en-US only if the URL is empty
  const currentLang = searchParams.get("display_lang") || "en-US";

  const finalHref = useMemo(() => {
    const baseHref = href.toString();

    // 2. Build the new URL
    const [pathWithoutHash, hash] = baseHref.split("#");
    const [pathWithoutQuery, query] = pathWithoutHash.split("?");

    const params = new URLSearchParams(query || "");

    // 3. Inject the current language into the new link
    params.set("display_lang", currentLang);

    return `${pathWithoutQuery}?${params.toString()}${hash ? `#${hash}` : ""}`;
  }, [href, currentLang]);

  return (
    <Link href={finalHref} className={className} {...props}>
      {children}
    </Link>
  );
}
