import * as fs from 'fs';
import * as path from 'path';
import { SupportedLang } from './lang.util';

type JsonObj = Record<string, any>;

const cache = new Map<string, JsonObj>();

function loadNamespace(lang: SupportedLang, ns: string): JsonObj {
  const key = `${lang}:${ns}`;
  if (cache.has(key)) return cache.get(key)!;

  // __dirname resolves to:
  //   dist/common/utils/  (compiled)  → dist/i18n/<lang>/<ns>.json
  //   src/common/utils/   (ts-node)   → src/i18n/<lang>/<ns>.json
  const filePath = path.join(__dirname, '..', '..', 'i18n', lang, `${ns}.json`);

  try {
    const content: JsonObj = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    cache.set(key, content);
    return content;
  } catch {
    cache.set(key, {});
    return {};
  }
}

function resolve(obj: JsonObj, dotPath: string): string | undefined {
  const result = dotPath.split('.').reduce<any>((cur, k) => cur?.[k], obj);
  return typeof result === 'string' ? result : undefined;
}

/**
 * Translate key="namespace.path" for the given lang.
 * Falls back to 'fr' when the key is missing in the requested language.
 * Supports {variable} interpolation via args.
 *
 * Examples:
 *   t('auth.invalid_credentials', 'ar')
 *   t('users.resend_wait', 'fr', { hours: 3 })
 *   t('mail.activation.subject', 'en')
 */
export function t(
  key: string,
  lang: SupportedLang,
  args?: Record<string, unknown>,
): string {
  const dot = key.indexOf('.');
  if (dot === -1) return key;

  const ns    = key.slice(0, dot);
  const kPath = key.slice(dot + 1);

  let text =
    resolve(loadNamespace(lang, ns), kPath) ??
    resolve(loadNamespace('fr', ns), kPath) ??
    key;

  if (args) {
    text = Object.entries(args).reduce(
      (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
      text,
    );
  }

  return text;
}
