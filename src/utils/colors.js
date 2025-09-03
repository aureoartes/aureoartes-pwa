// src/utils/colors.js
export function hexToRgb(hex) {
  if (!hex) return [0, 0, 0];
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  if (clean.length === 3) {
    const r = (bigint >> 8) & 0xf;
    const g = (bigint >> 4) & 0xf;
    const b = bigint & 0xf;
    return [r * 17, g * 17, b * 17];
  }
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

export function luminance([r, g, b]) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

export function getContrastShadow(hex) {
  const rgb = hexToRgb(hex);
  const lum = luminance(rgb);
  const isLight = lum > 0.5; // texto claro → sombra escura; texto escuro → sombra clara
  return isLight
    ? "0 1px 2px rgba(0,0,0,.9), 0 0 1px rgba(0,0,0,.7)"
    : "0 1px 2px rgba(255,255,255,.95), 0 0 1px rgba(255,255,255,.85)";
}