import { Alignment, Node, Style } from "../runtime/types";

export type Props = {
  children?: Node[] | Node | string;
  style?: {
    verticalAlignment?: Alignment;
  };
} & Style;

export const HorizontalView = (props?: Props): Node => {
  const { children, ...rest } = props || {};
  return {
    type: "HorizontalView",
    props: rest,
    children: Array.isArray(children) ? children : [],
  };
};
