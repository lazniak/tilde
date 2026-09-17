// BCP-47 tags for the 30 locales in app/lib/i18n/config.ts.
// Used by the voice ritual for SpeechRecognition.lang and for picking a
// speechSynthesis voice. Unknown codes fall back to en-US.

export const SPEECH_LANGS: Record<string, string> = {
  en: 'en-US',
  pl: 'pl-PL',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
  pt: 'pt-PT',
  nl: 'nl-NL',
  sv: 'sv-SE',
  da: 'da-DK',
  nb: 'nb-NO',
  fi: 'fi-FI',
  cs: 'cs-CZ',
  sk: 'sk-SK',
  uk: 'uk-UA',
  ru: 'ru-RU',
  ro: 'ro-RO',
  hu: 'hu-HU',
  el: 'el-GR',
  tr: 'tr-TR',
  ar: 'ar-SA',
  he: 'he-IL',
  hi: 'hi-IN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
  id: 'id-ID',
  vi: 'vi-VN',
  th: 'th-TH',
  bg: 'bg-BG',
}

export const DEFAULT_SPEECH_LANG = 'en-US'

export function speechLang(code: string): string {
  return SPEECH_LANGS[code] ?? DEFAULT_SPEECH_LANG
}
