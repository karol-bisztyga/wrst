export function jsx(type: any, props: any) {
  return {
    type,
    props: props || {},
    children: props?.children || [],
  };
}

export const jsxs = jsx;
