"use client";

import Link, { LinkProps } from "next/link";
import { ReactNode, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface CustomLinkProps extends LinkProps {
  children: ReactNode;
  className?: string;
  target?: string;
  rel?: string;
}

// 1. We move the logic into a separate inner component
function CustomLinkContent({
  href,
  children,
  className,
  ...props
}: CustomLinkProps) {
  const searchParams = useSearchParams();

  // Get the current lang directly from the active URL
  const currentLang = searchParams.get("display_lang") || "en-US";

  const finalHref = useMemo(() => {
    const baseHref = href.toString();
    const [pathWithoutHash, hash] = baseHref.split("#");
    const [pathWithoutQuery, query] = pathWithoutHash.split("?");

    const params = new URLSearchParams(query || "");
    params.set("display_lang", currentLang);

    return `${pathWithoutQuery}?${params.toString()}${hash ? `#${hash}` : ""}`;
  }, [href, currentLang]);

  return (
    <Link href={finalHref} className={className} {...props}>
      {children}
    </Link>
  );
}

// 2. The main component just provides the Suspense boundary
export default function CustomLink(props: CustomLinkProps) {
  return (
    <Suspense
      // Fallback is a standard Link with the original href
      // so it works even while loading or during build
      fallback={
        <Link href={props.href} className={props.className}>
          {props.children}
        </Link>
      }
    >
      <CustomLinkContent {...props} />
    </Suspense>
  );
}
