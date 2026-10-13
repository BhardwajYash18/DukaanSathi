/**
 * Supported Indian & regional languages for DukaanSathi
 */
export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr', locale: 'en-IN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr', locale: 'hi-IN' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', dir: 'ltr', locale: 'mr-IN' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', dir: 'ltr', locale: 'gu-IN' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', dir: 'ltr', locale: 'bn-IN' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', dir: 'ltr', locale: 'ta-IN' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', dir: 'ltr', locale: 'te-IN' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', dir: 'ltr', locale: 'kn-IN' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', dir: 'ltr', locale: 'ml-IN' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', dir: 'ltr', locale: 'pa-IN' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', dir: 'ltr', locale: 'or-IN' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', dir: 'ltr', locale: 'as-IN' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', dir: 'rtl', locale: 'ur-IN' },
];

export const DEFAULT_LANGUAGE = 'en';

export function getLanguageConfig(code) {
  return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
}
