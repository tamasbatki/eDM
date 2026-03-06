export const brandTokens = {
  colors: {
    primary: "#F18E00",
    secondary: "#454547",
    text: "#808083",
    mutedText: "#6C6C6E",
    border: "#E5E5E7",
    background: "#FFFFFF",
  },
  typography: {
    sans: '"Hurme Geometric Sans 3", "hurme_geometric_sans_3regular", "Segoe UI", Arial, Helvetica, sans-serif',
    heading: '"Hurme Geometric Sans 3", "hurme_geometric_sans_3SBd", "Segoe UI", Arial, Helvetica, sans-serif',
    headingWeight: 600,
    bodyWeight: 400,
    bodyLineHeight: 1.7,
  },
  spacing: {
    pagePaddingPx: 36,
    sectionGapPx: 24,
  },
} as const;

export type BrandTokens = typeof brandTokens;
