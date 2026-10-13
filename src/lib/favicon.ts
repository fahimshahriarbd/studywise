// SVG Favicon generator matching StudyWise's vibrant Sky-Blue theme

export const DEFAULT_FAVICON = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0ea5e9" />
      <stop offset="100%" stop-color="#2563eb" />
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="16" fill="url(#g1)"/>
  <!-- Graduation Cap -->
  <path d="M32 14L8 26l24 12 24-12L32 14z" fill="#ffffff"/>
  <path d="M16 32v12c0 6.627 7.163 12 16 12s16-5.373 16-12V32L32 40 16 32z" fill="#e0f2fe"/>
  <!-- Tassel -->
  <path d="M48 27v16c0 1.5-1 3-3 3" stroke="#ffffff" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <circle cx="45" cy="46" r="2.5" fill="#ffffff"/>
</svg>
`)}`;

// Male Student Favicon - Sky/Blue theme with boy/student profile
export const MALE_FAVICON = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#1d4ed8" />
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="16" fill="url(#g2)"/>
  <circle cx="32" cy="24" r="11" fill="#f8fafc"/>
  <!-- Hair -->
  <path d="M21 23c0-6 5-11 11-11 7 0 11 4 11 9 0 2-1 4-3 5-3-4-8-5-13-4-2 0-4 1-6 1z" fill="#1e293b"/>
  <!-- Shirt -->
  <path d="M16 54c0-8.837 7.163-16 16-16s16 7.163 16 16v2H16v-2z" fill="#ffffff"/>
  <!-- Collar -->
  <path d="M28 38l4 6 4-6v7l-4 6-4-6v-7z" fill="#0284c7"/>
</svg>
`)}`;

// Female Student Favicon - Hijab silhouette in Sky/Blue theme
export const FEMALE_FAVICON = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#2563eb" />
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="16" fill="url(#g3)"/>
  <!-- Hijab wrap -->
  <path d="M32 10c-9.5 0-17 7-17 18 0 7 3.5 12 5.5 16-1.5 2.5-4.5 5.5-6.5 7.5 5 2.5 11 3.5 18 3.5s13-1 18-3.5c-2-2-5-5-6.5-7.5 2-4 5.5-9 5.5-16 0-11-7.5-18-17-18z" fill="#ffffff"/>
  <!-- Face oval -->
  <path d="M32 20c-4.5 0-8 4-8 9 0 4 2.5 7 5 8.5 2 1.2 4 1.2 6 0 2.5-1.5 5-4.5 5-8.5 0-5-3.5-9-8-9z" fill="#0f172a"/>
  <!-- Drape flow -->
  <path d="M24 37.5c2.5 2.5 5.5 3.5 8 3.5s5.5-1 8-3.5c1 5 4 10 7 13.5-4.5 2-10 3-15 3s-10.5-1-15-3c3-3.5 6-8.5 7-13.5z" fill="#e2e8f0"/>
</svg>
`)}`;

export function updateAppFavicon(gender?: string | null) {
  if (typeof document === 'undefined') return;

  let href = DEFAULT_FAVICON;
  const g = (gender || '').trim().toLowerCase();

  if (g === 'female' || g === 'f') {
    href = FEMALE_FAVICON;
  } else if (g === 'male' || g === 'm') {
    href = MALE_FAVICON;
  }

  let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.getElementsByTagName('head')[0].appendChild(link);
  }
  link.href = href;
}
