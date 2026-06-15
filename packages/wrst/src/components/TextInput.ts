import { register } from "../registry/functions.ts";
import { MaybeState, Node, Style } from "../runtime/types.ts";

// A text field. Tapping it opens the platform's system text-entry UI - which
// bundles keyboard, handwriting, and **voice/dictation** on both watchOS
// (`TextField`) and Wear OS (the `RemoteInput` input activity). `onChange`
// receives the committed string.
export type Props = {
  value: MaybeState<string>;
  onChange: (text: string) => void;
  placeholder?: MaybeState<string>;
} & Style;

export const TextInput = (props: Props): Node => {
  const { onChange, ...rest } = props || ({} as Props);
  return {
    type: "TextInput",
    props: { onChange: onChange ? register(onChange) : null, ...rest },
    children: [],
  };
};
