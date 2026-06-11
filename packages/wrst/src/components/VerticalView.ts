import { Alignment, Node, Style } from "../runtime/types";

export type Props = {
  children?: Node[] | Node | string;
  style?: {
    horizontalAlignment?: Alignment;
  };
} & Style;

export const VerticalView = (props?: Props): Node => {
  const { children, ...rest } = props || {};
  return {
    type: "VerticalView",
    props: rest,
    children: Array.isArray(children) ? children : [],
  };
};
