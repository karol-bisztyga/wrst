import { MaybeState, Node, Style } from "../runtime/types";

export type TextStyle = {
  style?: {
    fontStyle?: MaybeState<"normal" | "italic" | (string & {})>;
    fontSize?: MaybeState<number>;
    fontWeight?: MaybeState<number>;
    fontFamily?: MaybeState<string>;
    textAlign?: MaybeState<
      "left" | "center" | "right" | "justify" | (string & {})
    >;
    lineHeight?: MaybeState<number>;
    letterSpacing?: MaybeState<number>;
    textOverflow?: MaybeState<
      | "visible"
      | "hidden"
      | "ellipsis"
      | "startEllipsis"
      | "endEllipsis"
      | (string & {})
    >;
    textDecoration?: MaybeState<
      | "none"
      | "underline"
      | "line-through"
      | "underline line-through"
      | (string & {})
    >;
    softWrap?: MaybeState<boolean>;
    maxLines?: MaybeState<number>;
    // wear os only
    minLines?: MaybeState<number>;
  };
};

export type TextChild = MaybeState<string | number | boolean>;

export type Props = {
  children?: TextChild | TextChild[];
} & Style &
  TextStyle;

export const Text = (props: Props): Node => {
  const { children, ...rest } = props || {};
  const childArray = Array.isArray(children)
    ? children
    : children !== undefined
      ? [children]
      : [];
  return {
    type: "Text",
    props: rest,
    children: childArray,
  };
};
