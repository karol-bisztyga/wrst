import { register } from "../registry/functions.ts";
import { MaybeState, Node, Style } from "../runtime/types.ts";

// A full-screen +/- value stepper, crown-adjustable on watch. Maps to SwiftUI's
// `Stepper` and Wear's `Stepper`. `onChange` receives the new number; `label`
// (optional) is shown in the center, otherwise the current value is shown.
export type Props = {
  value: MaybeState<number>;
  onChange: (value: number) => void;
  /** @default 0 */
  min?: MaybeState<number>;
  /** @default 10 */
  max?: MaybeState<number>;
  /** @default 1 */
  step?: MaybeState<number>;
  label?: MaybeState<string>;
} & Style;

export const Stepper = (props: Props): Node => {
  const { onChange, ...rest } = props || ({} as Props);
  return {
    type: "Stepper",
    props: { onChange: onChange ? register(onChange) : null, ...rest },
    children: [],
  };
};
