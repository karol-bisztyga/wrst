import { register } from "../registry/functions.ts";
import { MaybeState, Node, Style } from "../runtime/types.ts";

export type ListProps = {
  items: MaybeState<any[]>;
  renderItem: (item: any, index: number) => Node;
} & Style;

export const List = (props: ListProps): Node => {
  const { items, renderItem, ...rest } = props;
  return {
    type: "List",
    props: {
      items,
      renderItemId: register(renderItem),
      ...rest,
    },
    children: [],
  };
};
