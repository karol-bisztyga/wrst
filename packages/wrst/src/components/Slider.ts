import { register } from "../registry/functions.ts";
import { MaybeState, Node, Style } from "../runtime/types.ts";

// A horizontal value slider, crown-adjustable on watch. Maps to SwiftUI's
// `Slider` and Wear's `InlineSlider`. `onChange` receives the new number.
export type Props = {
  value: MaybeState<number>;
  onChange: (value: number) => void;
  /** @default 0 */
  min?: MaybeState<number>;
  /** @default 1 */
  max?: MaybeState<number>;
  /** Step between values. @default 0.1 */
  step?: MaybeState<number>;
} & Style;

export const Slider = (props: Props): Node => {
  const { onChange, ...rest } = props || ({} as Props);
  return {
    type: "Slider",
    props: { onChange: onChange ? register(onChange) : null, ...rest },
    children: [],
  };
};
