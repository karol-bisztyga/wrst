import { MaybeState, Node, Style } from "../runtime/types";

// A circular progress indicator. Omit `value` for an indeterminate spinner;
// pass `value` (0..1) for a determinate ring. Maps to Wear's
// CircularProgressIndicator and SwiftUI's circular ProgressView.
export type Props = {
  value?: MaybeState<number>;
  // Diameter in points/dp (default 40).
  size?: MaybeState<number>;
  color?: MaybeState<string>;
  // Ease the determinate ring between values instead of snapping (default false).
  animated?: MaybeState<boolean>;
} & Style;

export const Progress = (props?: Props): Node => ({
  type: "Progress",
  props: props ?? {},
  children: [],
});
