import type en from "../locales/en.json";
import type { Locale } from "./config";

// Typed translation keys: a typo, or a key missing from en.json, fails `tsc`.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof en;
  }
}
