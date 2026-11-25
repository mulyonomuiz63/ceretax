import { useEffect, useState } from 'react';
import { BrandingSettings, DEFAULT_FOOTER_SETTINGS, FooterSettings } from '../types/tax.ts';

export const DEFAULT_META_ICON_URL = '/assets/aistudio/kelasbrevet_icon_transparent.png';

export function normalizeFooterSettings(raw?: Partial<FooterSettings> | null): FooterSettings {
  const src = raw || {};
  return {
    orgTitle: typeof src.orgTitle === 'string' && src.orgTitle.trim() ? src.orgTitle : DEFAULT_FOOTER_SETTINGS.orgTitle,
    orgSubtitle: typeof src.orgSubtitle === 'string' ? src.orgSubtitle : DEFAULT_FOOTER_SETTINGS.orgSubtitle,
    address: typeof src.address === 'string' ? src.address : DEFAULT_FOOTER_SETTINGS.address,
    phone: typeof src.phone === 'string' ? src.phone : DEFAULT_FOOTER_SETTINGS.phone,
    hotlineLabel: typeof src.hotlineLabel === 'string' ? src.hotlineLabel : DEFAULT_FOOTER_SETTINGS.hotlineLabel,
    email: typeof src.email === 'string' ? src.email : DEFAULT_FOOTER_SETTINGS.email,
    websitePrimary: typeof src.websitePrimary === 'string' ? src.websitePrimary : DEFAULT_FOOTER_SETTINGS.websitePrimary,
    websiteSecondary: typeof src.websiteSecondary === 'string' ? src.websiteSecondary : DEFAULT_FOOTER_SETTINGS.websiteSecondary,
    socialHandle: typeof src.socialHandle === 'string' ? src.socialHandle : DEFAULT_FOOTER_SETTINGS.socialHandle,
    facebookUrl: typeof src.facebookUrl === 'string' ? src.facebookUrl : DEFAULT_FOOTER_SETTINGS.facebookUrl,
    xUrl: typeof src.xUrl === 'string' ? src.xUrl : DEFAULT_FOOTER_SETTINGS.xUrl,
    instagramUrl: typeof src.instagramUrl === 'string' ? src.instagramUrl : DEFAULT_FOOTER_SETTINGS.instagramUrl,
    youtubeUrl: typeof src.youtubeUrl === 'string' ? src.youtubeUrl : DEFAULT_FOOTER_SETTINGS.youtubeUrl,
    copyrightText:
      typeof src.copyrightText === 'string' && src.copyrightText.trim()
        ? src.copyrightText
        : DEFAULT_FOOTER_SETTINGS.copyrightText,
  };
}

const DEFAULT_BRANDING: BrandingSettings = {
  logoUrl: '',
  metaIconUrl: '',
  brandName: 'KelasBrevet',
  footer: { ...DEFAULT_FOOTER_SETTINGS },
  updatedAt: '',
};

let cachedBranding: BrandingSettings = { ...DEFAULT_BRANDING };
let hasFetched = false;
let inflight: Promise<BrandingSettings> | null = null;
const listeners = new Set<(b: BrandingSettings) => void>();

function upsertLinkTag(rel: string, href: string) {
  if (typeof document === 'undefined') return;
  let link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  if (link.href !== href && link.getAttribute('href') !== href) {
    link.href = href;
  }
}

function upsertMetaTag(attr: 'property' | 'name', key: string, content: string) {
  if (typeof document === 'undefined') return;
  let meta = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attr, key);
    document.head.appendChild(meta);
  }
  if (meta.getAttribute('content') !== content) {
    meta.setAttribute('content', content);
  }
}

export function applyMetaIconToDocument(branding: BrandingSettings) {
  if (typeof document === 'undefined') return;
  const effectiveIcon = branding.metaIconUrl?.trim() || DEFAULT_META_ICON_URL;
  upsertLinkTag('icon', effectiveIcon);
  upsertLinkTag('shortcut icon', effectiveIcon);
  upsertLinkTag('apple-touch-icon', effectiveIcon);

  const metaImageUrl = branding.metaIconUrl?.startsWith('data:')
    ? `/api/branding/meta-icon?v=${encodeURIComponent(branding.updatedAt || '1')}`
    : effectiveIcon;
  upsertMetaTag('property', 'og:image', metaImageUrl);
  upsertMetaTag('name', 'twitter:image', metaImageUrl);
}

function notifyListeners(next: BrandingSettings) {
  cachedBranding = next;
  applyMetaIconToDocument(next);
  listeners.forEach((fn) => fn(next));
}

export function setBrandingCache(next: BrandingSettings) {
  hasFetched = true;
  notifyListeners({
    logoUrl: next.logoUrl || '',
    metaIconUrl: next.metaIconUrl || '',
    brandName: next.brandName || 'KelasBrevet',
    footer: normalizeFooterSettings(next.footer),
    updatedAt: next.updatedAt || '',
  });
}

export async function fetchBrandingSettings(force = false): Promise<BrandingSettings> {
  if (hasFetched && !force) return cachedBranding;
  if (inflight && !force) return inflight;

  inflight = fetch('/api/branding')
    .then(async (resp) => {
      if (!resp.ok) return cachedBranding;
      const data = await resp.json();
      const b = data?.branding;
      if (b) {
        hasFetched = true;
        const normalized: BrandingSettings = {
          logoUrl: String(b.logoUrl || ''),
          metaIconUrl: String(b.metaIconUrl || ''),
          brandName: String(b.brandName || 'KelasBrevet'),
          footer: normalizeFooterSettings(b.footer),
          updatedAt: String(b.updatedAt || ''),
        };
        notifyListeners(normalized);
        return normalized;
      }
      return cachedBranding;
    })
    .catch(() => cachedBranding)
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function useBranding(): BrandingSettings {
  const [branding, setBranding] = useState<BrandingSettings>(cachedBranding);

  useEffect(() => {
    listeners.add(setBranding);
    if (!hasFetched) {
      fetchBrandingSettings();
    } else {
      setBranding(cachedBranding);
    }
    return () => {
      listeners.delete(setBranding);
    };
  }, []);

  return branding;
}
