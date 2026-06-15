import { register } from "../registry/functions.ts";
import { Alignment, Callback, Node, Style } from "../runtime/types.ts";

export type Props = {
  onPress: Callback;
  /** Fired on a long press (combined-click on Wear, long-press gesture on watchOS). */
  onLongPress?: Callback;
  children?: Node | Node[];
  style?: {
    verticalAlignment?: Alignment;
    horizontalAlignment?: Alignment;
  };
} & Style;

export const Button = (props: Props): Node => {
  const { onPress, onLongPress, children, ...rest } = props || {};
  return {
    type: "Button",
    props: {
      onPress: onPress ? register(onPress) : null,
      onLongPress: onLongPress ? register(onLongPress) : null,
      ...rest,
    },
    children: Array.isArray(children) ? children : children ? [children] : [],
  };
};
