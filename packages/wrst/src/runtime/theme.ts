// Theme tokens - a pure-JS way to centralize an app's colors/spacing/typography
// so screens don't hardcode hex values. No native involvement: `createTheme`
// just merges your overrides onto sensible defaults and freezes the result; you
// reference `theme.colors.primary` etc. in styles.

export type Theme = {
  colors: {
    background: string;
    surface: string;
    primary: string;
    onPrimary: string;
    text: string;
    muted: string;
    accent: string;
    danger: string;
  };
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number };
  radius: { sm: number; md: number; lg: number; pill: number };
  font: { sm: number; md: number; lg: number; xl: number };
};

const DEFAULT_THEME: Theme = {
  colors: {
    background: "#000000",
    surface: "#1c1c1e",
    primary: "#0a84ff",
    onPrimary: "#ffffff",
    text: "#ffffff",
    muted: "#8e8e93",
    accent: "#30d158",
    danger: "#ff453a",
  },
  spacing: { xs: 2, sm: 4, md: 8, lg: 16, xl: 24 },
  radius: { sm: 4, md: 8, lg: 16, pill: 999 },
  font: { sm: 12, md: 16, lg: 20, xl: 28 },
};

type DeepPartial<T> = { [K in keyof T]?: Partial<T[K]> };

// Merge overrides onto the defaults (one level deep, which covers every token
// group) and freeze so a theme is a stable, shareable constant.
export function createTheme(overrides: DeepPartial<Theme> = {}): Theme {
  const merge = <K extends keyof Theme>(key: K): Theme[K] => ({
    ...DEFAULT_THEME[key],
    ...(overrides[key] ?? {}),
  });
  return Object.freeze({
    colors: Object.freeze(merge("colors")),
    spacing: Object.freeze(merge("spacing")),
    radius: Object.freeze(merge("radius")),
    font: Object.freeze(merge("font")),
  }) as Theme;
}

// The default theme, ready to use without any overrides.
export const defaultTheme: Theme = createTheme();
