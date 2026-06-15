import { register } from "../registry/functions.ts";
import { Alignment, Callback, MaybeState, Node, Style } from "../runtime/types.ts";

// A general press wrapper (like RN's TouchableOpacity): wrap *any* children and
// receive tap + long-press, with a press-dim for feedback. Use it to make an
// Image, a custom layout, etc. tappable. Maps to a press-tracking container on
// both platforms (SwiftUI gesture + opacity; Wear combinedClickable + alpha).
export type Props = {
  onPress?: Callback;
  onLongPress?: Callback;
  /** Opacity while pressed (0..1). @default 0.6 */
  activeOpacity?: MaybeState<number>;
  children?: Node | Node[];
  style?: {
    verticalAlignment?: Alignment;
    horizontalAlignment?: Alignment;
  };
} & Style;

export const Touchable = (props: Props): Node => {
  const { onPress, onLongPress, children, ...rest } = props || ({} as Props);
  return {
    type: "Touchable",
    props: {
      onPress: onPress ? register(onPress) : null,
      onLongPress: onLongPress ? register(onLongPress) : null,
      ...rest,
    },
    children: Array.isArray(children) ? children : children ? [children] : [],
  };
};
