export const APP_BRAND_NAME = "מנלו קודקס";
export const APP_BRAND_SHORT_NAME = "קודקס";
export const APP_BRAND_TAGLINE = "מערכת ניהול לקבלן בניין";
export const APP_DEFAULT_ORG_NAME = "מנלו בנייה";
export const APP_DRIVE_ROOT_FOLDER = "מנלו בנייה";
export const APP_PRODUCTION_URL = "https://menlo-codex.vercel.app";
export const APP_ASSET_VERSION = "2026-05-16-1";
export const APP_PWA_CACHE_VERSION = APP_ASSET_VERSION;
export const APP_INSTALL_ID = "/?app=menlo-codex-v3";

export const APP_ICON_192 = "/generated-app-icon-192.png";
export const APP_ICON_512 = "/generated-app-icon-512.png";
export const APP_ICON_MASKABLE = "/generated-app-icon-maskable-512.png";

export const APP_ICON_192_VERSIONED = `${APP_ICON_192}?v=${APP_ASSET_VERSION}`;
export const APP_ICON_512_VERSIONED = `${APP_ICON_512}?v=${APP_ASSET_VERSION}`;
export const APP_ICON_MASKABLE_VERSIONED = `${APP_ICON_MASKABLE}?v=${APP_ASSET_VERSION}`;

const APP_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="מנלו בנייה"><rect width="512" height="512" rx="96" fill="#f5c842"/><circle cx="256" cy="256" r="214" fill="#fff"/><g transform="translate(310 176) scale(.86)"><path d="M6 4c42 0 90 81 100 188-29 13-69 13-100 1V4Z" fill="#227db9"/><path d="M118 5c34 0 77 70 89 185-31 14-70 14-104 2 7-83 28-147 15-187Z" fill="#f5c842"/><path d="M94 112c25 30 40 72 36 112-19 15-53 15-73 0 0-43 13-82 37-112Z" fill="#00a99d" opacity=".92"/></g><text x="201" y="287" text-anchor="middle" direction="rtl" unicode-bidi="bidi-override" font-family="Arial, Heebo, sans-serif" font-weight="900" font-size="112" fill="#414042">מנלו</text><text x="148" y="340" text-anchor="middle" direction="rtl" unicode-bidi="bidi-override" font-family="Arial, Heebo, sans-serif" font-weight="700" font-size="48" fill="#414042">בניה</text></svg>`;
const APP_LOGO_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(APP_LOGO_SVG)}`;

export const APP_LOGO_FULL = APP_ICON_512_VERSIONED;
export const APP_LOGO_ICON = APP_LOGO_DATA_URI;
export const APP_LOGO_CIRCLE = APP_LOGO_DATA_URI;
export const APP_LOGO_MARK = APP_LOGO_DATA_URI;
