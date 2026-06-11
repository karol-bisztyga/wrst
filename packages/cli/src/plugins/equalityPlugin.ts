import * as ts from "typescript";
import { readFile } from "fs/promises";
import type { Plugin } from "esbuild";

// __cmpVal: unwrap state proxies so === / !== compare actual values, not proxy objects.
// Plain JS in the banner so it's never processed by this transform.
const BANNER =
  `var __cmpVal=function(x){` +
  `if(x===null)return null;` +
  `if(x===undefined)return undefined;` +
  `if(x instanceof Date)return x;` +
  `return x.valueOf();` +
  `};`;

function transformSource(source: string, filePath: string): string {
  const scriptKind = filePath.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : ts.ScriptKind.TS;

  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );

  const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
    const visit = (node: ts.Node): ts.Node => {
      // {expr} in JSX → {computed(() => expr)}
      // computed() tracks which state values are read during evaluation,
      // registers a derived MutableState, and keeps it updated when deps change.
      // If no state reads happen (plain literal, component node, etc.) it returns
      // the value as-is with zero overhead.
      if (
        ts.isJsxExpression(node) &&
        !node.dotDotDotToken &&
        node.expression
      ) {
        const inner = node.expression;
        // Skip if already wrapped (avoids double-wrapping on re-transform)
        if (
          ts.isCallExpression(inner) &&
          ts.isIdentifier(inner.expression) &&
          inner.expression.text === "computed"
        ) {
          return ts.visitEachChild(node, visit, context);
        }
        return ts.factory.createJsxExpression(
          node.dotDotDotToken,
          ts.factory.createCallExpression(
            ts.factory.createIdentifier("computed"),
            undefined,
            [
              ts.factory.createArrowFunction(
                undefined,
                undefined,
                [],
                undefined,
                ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                ts.visitNode(inner, visit) as ts.Expression,
              ),
            ],
          ),
        );
      }

      // a === b  →  __cmpVal(a) === __cmpVal(b)
      // a !== b  →  __cmpVal(a) !== __cmpVal(b)
      // a && b   →  __cmpVal(a) && b   (left side controls short-circuit)
      // a || b   →  __cmpVal(a) || b
      // a ?? b   →  __cmpVal(a) ?? b
      if (ts.isBinaryExpression(node)) {
        const op = node.operatorToken.kind;
        const wrap = (n: ts.Expression): ts.CallExpression =>
          ts.factory.createCallExpression(
            ts.factory.createIdentifier("__cmpVal"),
            undefined,
            [ts.visitNode(n, visit) as ts.Expression],
          );
        if (
          op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
          op === ts.SyntaxKind.ExclamationEqualsEqualsToken
        ) {
          return ts.factory.createBinaryExpression(
            wrap(node.left),
            op,
            wrap(node.right),
          );
        }
        if (
          op === ts.SyntaxKind.AmpersandAmpersandToken ||
          op === ts.SyntaxKind.BarBarToken ||
          op === ts.SyntaxKind.QuestionQuestionToken
        ) {
          return ts.factory.createBinaryExpression(
            wrap(node.left),
            op,
            ts.visitNode(node.right, visit) as ts.Expression,
          );
        }
      }

      // a ? b : c  →  __cmpVal(a) ? b : c
      if (ts.isConditionalExpression(node)) {
        return ts.factory.createConditionalExpression(
          ts.factory.createCallExpression(
            ts.factory.createIdentifier("__cmpVal"),
            undefined,
            [ts.visitNode(node.condition, visit) as ts.Expression],
          ),
          node.questionToken,
          ts.visitNode(node.whenTrue, visit) as ts.Expression,
          node.colonToken,
          ts.visitNode(node.whenFalse, visit) as ts.Expression,
        );
      }

      // !a  →  !__cmpVal(a)
      if (
        ts.isPrefixUnaryExpression(node) &&
        node.operator === ts.SyntaxKind.ExclamationToken
      ) {
        return ts.factory.createPrefixUnaryExpression(
          ts.SyntaxKind.ExclamationToken,
          ts.factory.createCallExpression(
            ts.factory.createIdentifier("__cmpVal"),
            undefined,
            [ts.visitNode(node.operand, visit) as ts.Expression],
          ),
        );
      }

      // if (a)  →  if (__cmpVal(a))
      if (ts.isIfStatement(node)) {
        return ts.factory.createIfStatement(
          ts.factory.createCallExpression(
            ts.factory.createIdentifier("__cmpVal"),
            undefined,
            [ts.visitNode(node.expression, visit) as ts.Expression],
          ),
          ts.visitNode(node.thenStatement, visit) as ts.Statement,
          node.elseStatement
            ? (ts.visitNode(node.elseStatement, visit) as ts.Statement)
            : undefined,
        );
      }

      return ts.visitEachChild(node, visit, context);
    };
    return (sf) => ts.visitNode(sf, visit) as ts.SourceFile;
  };

  const result = ts.transform(sourceFile, [transformer]);
  const output = ts.createPrinter().printFile(result.transformed[0]);
  result.dispose();
  return output;
}

export function equalityPlugin(): Plugin {
  return {
    name: "equality-transform",
    setup(build) {
      build.initialOptions.banner = build.initialOptions.banner ?? {};
      build.initialOptions.banner.js =
        BANNER + (build.initialOptions.banner.js ?? "");

      build.onLoad({ filter: /\.(ts|tsx)$/ }, async (args) => {
        const normalized = args.path.replace(/\\/g, "/");
        if (/\/(runtime|hooks|plugins|server|registry)\//i.test(normalized)) {
          return null;
        }
        const source = await readFile(args.path, "utf8");
        return {
          contents: transformSource(source, args.path),
          loader: args.path.endsWith(".tsx") ? "tsx" : "ts",
        };
      });
    },
  };
}
