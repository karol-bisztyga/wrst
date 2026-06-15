import { register } from "../registry/functions.ts";
import { MaybeState, Node, Style } from "../runtime/types.ts";

// An on/off switch. Maps to SwiftUI's `Toggle` and Wear's `ToggleChip` (with a
// Switch control). `onChange` receives the new boolean. Provide a `label` for
// the text shown beside the control.
export type Props = {
  value: MaybeState<boolean>;
  onChange: (value: boolean) => void;
  label?: MaybeState<string>;
} & Style;

export const Toggle = (props: Props): Node => {
  const { onChange, ...rest } = props || ({} as Props);
  return {
    type: "Toggle",
    props: { onChange: onChange ? register(onChange) : null, ...rest },
    children: [],
  };
};
