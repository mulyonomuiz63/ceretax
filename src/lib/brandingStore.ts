import { useEffect, useState } from 'react';
import { BrandingSettings } from '../types/tax.ts';

const DEFAULT_BRANDING: BrandingSettings = {
  logoUrl: '',
  brandName: 'KelasBrevet',
  updatedAt: '',
};

let cachedBranding: BrandingSettings = { ...DEFAULT_BRANDING };
let hasFetched = false;
let inflight: Promise<BrandingSettings> | null = null;
const listeners = new Set<(b: BrandingSettings) => void>();

function notifyListeners(next: BrandingSettings) {
  cachedBranding = next;
  listeners.forEach((fn) => fn(next));
}

export function setBrandingCache(next: BrandingSettings) {
  hasFetched = true;
  notifyListeners({
    logoUrl: next.logoUrl || '',
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
