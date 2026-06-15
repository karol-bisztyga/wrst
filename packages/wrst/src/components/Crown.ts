import { register } from "../registry/functions.ts";
import { Alignment, MaybeState, Node, Style } from "../runtime/types.ts";

// Raw Digital Crown / rotary input. A focusable region whose `value` is driven
// by the crown (watchOS `digitalCrownRotation`) / rotary bezel (Wear
// `onRotaryScrollEvent`); wrap any custom visual (a dial, gauge, ...) as
// children and read the value from state. `onChange` receives the new number.
//
// Only one focused element receives the crown at a time - give a Crown its own
// screen (or keep it away from a Slider/Picker, which also capture the crown).
export type Props = {
  value: MaybeState<number>;
  onChange: (value: number) => void;
  /** @default 0 */
  min?: MaybeState<number>;
  /** @default 100 */
  max?: MaybeState<number>;
  /** @default 1 */
  step?: MaybeState<number>;
  children?: Node | Node[];
  style?: {
    verticalAlignment?: Alignment;
    horizontalAlignment?: Alignment;
  };
} & Style;

export const Crown = (props: Props): Node => {
  const { onChange, children, ...rest } = props || ({} as Props);
  return {
    type: "Crown",
    props: { onChange: onChange ? register(onChange) : null, ...rest },
    children: Array.isArray(children) ? children : children ? [children] : [],
  };
};
