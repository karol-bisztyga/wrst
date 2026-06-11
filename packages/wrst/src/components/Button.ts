import { register } from "../registry/functions.ts";
import { Alignment, Callback, Node, Style } from "../runtime/types.ts";

export type Props = {
  onPress: Callback;
  children?: Node | Node[];
  style?: {
    verticalAlignment?: Alignment;
    horizontalAlignment?: Alignment;
  };
} & Style;

export const Button = (props: Props): Node => {
  const { onPress, children, ...rest } = props || {};
  return {
    type: "Button",
    props: {
      onPress: onPress ? register(onPress) : null,
      ...rest,
    },
    children: Array.isArray(children) ? children : children ? [children] : [],
  };
};
