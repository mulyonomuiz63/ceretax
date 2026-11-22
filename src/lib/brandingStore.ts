import { useEffect, useState } from 'react';
import { BrandingSettings } from '../types/tax.ts';

export const DEFAULT_META_ICON_URL = '/assets/aistudio/kelasbrevet_icon_transparent.png';

const DEFAULT_BRANDING: BrandingSettings = {
  logoUrl: '',
  metaIconUrl: '',
  brandName: 'KelasBrevet',
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
