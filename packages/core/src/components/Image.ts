import { MaybeState, Node, Style } from "../runtime/types";

// An image loaded from a URL (https in dev/prod, or the dev server's asset URL
// for project-local images). Set width/height via style. Maps to SwiftUI
// AsyncImage / Coil AsyncImage.
export type ImageResizeMode = "fit" | "cover" | "stretch";

export type Props = {
  src: MaybeState<string>;
  // How the image fills its box: "fit" (contain, default), "cover" (fill+crop),
  // "stretch" (fill, ignore aspect ratio).
  resizeMode?: MaybeState<ImageResizeMode | (string & {})>;
  // A component rendered while the image loads (e.g. <Progress /> or a Text).
  // Omit for nothing. The image replaces it once loaded.
  loader?: Node;
} & Style;

export const Image = (props: Props): Node => ({
  type: "Image",
  props,
  children: [],
});
