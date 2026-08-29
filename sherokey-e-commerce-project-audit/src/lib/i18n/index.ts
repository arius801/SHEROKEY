import type { Locale } from "./locales";
import en from "./dictionaries/en";
import ar from "./dictionaries/ar";
import ru from "./dictionaries/ru";
import type { Dictionary } from "./dictionaries/en";

const dictionaries: Record<Locale, Dictionary> = { en, ar, ru };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.en;
}

export type { Dictionary };
export * from "./locales";
