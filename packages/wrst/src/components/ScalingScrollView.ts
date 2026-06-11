import { Node, Style } from "../runtime/types.ts";

export type Props = {
  children?: Node | Node[];
} & Style;

// A scrolling list with the native watch "scaling" aesthetic: items scale/fade
// toward the edges and the list is center-anchored. Maps to ScalingLazyColumn on
// Wear OS and a carousel List on Apple Watch. For a plain top-aligned scroll, use
// ScrollView instead.
export const ScalingScrollView = (props: Props): Node => {
  const { children, ...rest } = props || {};
  return {
    type: "ScalingScrollView",
    props: rest,
    children: Array.isArray(children) ? children : children ? [children] : [],
  };
};
