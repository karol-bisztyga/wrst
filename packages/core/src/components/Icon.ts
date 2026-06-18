import { MaybeState, Node, Style } from "../runtime/types";

// Cross-platform icon names. Each native host maps these to its built-in icon
// set - SF Symbols on Apple Watch, Material icons on Wear OS - so no images are
// bundled. Unknown names fall back to a placeholder glyph.
export type IconName =
  | "home"
  | "search"
  | "settings"
  | "heart"
  | "star"
  | "check"
  | "close"
  | "add"
  | "delete"
  | "edit"
  | "back"
  | "forward"
  | "play"
  | "info"
  | "warning"
  | "share"
  | "menu"
  | "refresh"
  | "person"
  | "notifications";

export type Props = {
  name: MaybeState<IconName | (string & {})>;
  // Glyph size in points/dp (default 24).
  size?: MaybeState<number>;
  // Tint color (default white).
  color?: MaybeState<string>;
} & Style;

export const Icon = (props: Props): Node => ({
  type: "Icon",
  props,
  children: [],
});
