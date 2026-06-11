import { Alignment, Node, Style } from "../runtime/types";

export type Props = {
  children?: Node[] | Node | string;
  style?: {
    verticalAlignment?: Alignment;
    horizontalAlignment?: Alignment;
  };
} & Style;

export const View = (props?: Props): Node => {
  const { children, ...rest } = props || {};
  return {
    type: "View",
    props: rest,
    children: Array.isArray(children) ? children : [],
  };
};
