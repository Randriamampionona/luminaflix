"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * One word at a time, sliding up (Movies → K-Dramas → Anime → TV Shows…), in a
 * box as wide as the longest word, so the button never changes size.
 */
export default function WordTicker({
  words,
  interval = 2200,
  align = "left",
}: {
  words: string[];
  interval?: number;
  /** "center" when text follows the word (keeps the gaps even). */
  align?: "left" | "center";
}) {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || words.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % words.length), interval);
    return () => clearInterval(timer);
  }, [reduced, words.length, interval]);

  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), "");

  return (
    <span className="relative inline-grid h-[1.4em] overflow-hidden leading-[1.4em]" aria-live="off">
      {/* Sizes the box to the longest word */}
      <span className="invisible col-start-1 row-start-1">{longest}</span>
      {words.map((word, i) => (
        <span
          key={word}
          aria-hidden={i !== index}
          className={`col-start-1 row-start-1 ${align === "center" ? "text-center" : "text-left"} transition-all duration-500 ease-out motion-reduce:transition-none`}
          style={{
            transform: `translateY(${i === index ? 0 : i === (index - 1 + words.length) % words.length ? -110 : 110}%)`,
            opacity: i === index ? 1 : 0,
          }}
        >
          {word}
        </span>
      ))}
    </span>
  );
}
