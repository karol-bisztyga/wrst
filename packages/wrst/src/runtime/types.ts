export type Callback = () => void;

export type Props = Record<string, any>;

export type StateRef = {
  __stateRef: string;
};

export type MaybeState<T> = T | StateRef;

export type Node =
  | {
      type: string;
      props: Props;
      children: MaybeState<Node>[];
    }
  | Callback
  | string
  | number
  | boolean;

export type ComponentProps = {
  [key: string]: MaybeState<Node> | MaybeState<Node>[] | undefined;
  children?: MaybeState<Node>[];
};

export type Component = (props?: ComponentProps) => Node;

// necessary for JSX support
declare global {
  namespace JSX {
    type Element = Node;

    interface ElementChildrenAttribute {
      children: {};
    }

    interface IntrinsicAttributes {}

    type LibraryManagedAttributes<C, P> = P;
  }
}

export type Alignment = "start" | "center" | "end" | (string & {});

// styles
export type Style = {
  hidden?: MaybeState<boolean>;
  style?: {
    color?: MaybeState<string>;
    backgroundColor?: MaybeState<string>;
    borderColor?: MaybeState<string>;
    borderWidth?: MaybeState<number>;
    borderRadius?: MaybeState<number>;
    padding?: MaybeState<number | string>;
    // margin?: number | string; // cannot handle margin easily in wear os
    width?: MaybeState<number | "fill" | (string & {})>;
    height?: MaybeState<number | "fill" | (string & {})>;
    // size sets both width and height
    size?: MaybeState<number | "fill" | (string & {})>;
    opacity?: MaybeState<number>;
    x?: MaybeState<number>;
    y?: MaybeState<number>;
  };
};
