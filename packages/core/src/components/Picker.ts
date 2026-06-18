import { register } from "../registry/functions.ts";
import { MaybeState, Node, Style } from "../runtime/types.ts";

// A scrolling wheel of options, crown-adjustable on watch. Maps to SwiftUI's
// wheel `Picker` and Wear's `Picker`. `onChange` receives the selected index.
export type Props = {
  options: MaybeState<string[]>;
  selectedIndex: MaybeState<number>;
  onChange: (index: number) => void;
} & Style;

export const Picker = (props: Props): Node => {
  const { onChange, ...rest } = props || ({} as Props);
  return {
    type: "Picker",
    props: { onChange: onChange ? register(onChange) : null, ...rest },
    children: [],
  };
};
