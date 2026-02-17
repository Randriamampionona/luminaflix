"use client";
import Script from "next/script";

export default function AdsterraSocialBar() {
  return (
    <Script
      id="adsterra-social-bar-js"
      src="https://superioroptionaleveryone.com/13/2d/0f/132d0fb068e7a8502626b62058e49e8d.js"
      strategy="afterInteractive"
      data-cfasync="false"
      onError={(e) => {
        console.error("Adsterra Social Bar failed to load", e);
      }}
    />
  );
}
