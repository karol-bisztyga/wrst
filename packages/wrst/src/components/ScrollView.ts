import { Node, Style } from "../runtime/types.ts";

export type Props = {
  children?: Node | Node[];
} & Style;

export const ScrollView = (props: Props): Node => {
  const { children, ...rest } = props || {};
  return {
    type: "ScrollView",
    props: rest,
    children: Array.isArray(children) ? children : children ? [children] : [],
  };
};
