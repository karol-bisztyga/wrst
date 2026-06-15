import { register } from "../registry/functions.ts";
import { MaybeState, Node, Style } from "../runtime/types.ts";

// A vertical single-select list (one option active at a time). Unlike `Picker`
// (a scrolling wheel), every option is shown as a row with a radio indicator.
// Maps to Wear's `ToggleChip` + `RadioButton` rows and a SwiftUI row list.
// `onChange` receives the selected index.
export type Props = {
  options: MaybeState<string[]>;
  selectedIndex: MaybeState<number>;
  onChange: (index: number) => void;
} & Style;

export const RadioGroup = (props: Props): Node => {
  const { onChange, ...rest } = props || ({} as Props);
  return {
    type: "RadioGroup",
    props: { onChange: onChange ? register(onChange) : null, ...rest },
    children: [],
  };
};
