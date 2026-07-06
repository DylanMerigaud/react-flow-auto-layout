import { ESLintUtils, type TSESTree } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator((name) => `${name}`);

// Built from char codes so this rule file doesn't trip itself.
const EM_DASH = String.fromCharCode(0x2014); // the em-dash
const EN_DASH = String.fromCharCode(0x2013); // the en-dash, same AI tell
const SEMI = String.fromCharCode(0x3b); // semicolon

/**
 * Keep the em-dash (and its en-dash sibling) out of the source entirely, and the
 * semicolon out of on-screen text. The em/en-dash never appear in real code, so
 * banning them in strings, JSX text, AND comments has no false positives and gets
 * rid of the AI-written look across the whole repo. The semicolon, by contrast,
 * lives in plenty of legitimate strings (fixtures, test names, code), so it's only
 * checked in JSX text, where it reads stiff. A genuine need (the "no value" dash
 * glyph) takes a per-line eslint-disable with a reason.
 */
export const noEmdashInText = createRule({
  name: "no-emdash-in-text",
  defaultOptions: [],
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Ban the em/en-dash in all text (incl. comments) and the semicolon in JSX text",
    },
    messages: {
      dash: "Avoid the em/en-dash. Use a comma, colon, parentheses, or a new sentence.",
      semi: "Avoid the semicolon in on-screen text. Use a comma or a new sentence.",
    },
    schema: [],
  },
  create(context) {
    const checkDash = (node: TSESTree.Node | TSESTree.Comment, raw: string) => {
      if (raw.includes(EM_DASH) || raw.includes(EN_DASH)) {
        context.report({ node, messageId: "dash" });
      }
    };

    // Comments aren't AST nodes you can visit directly; pull them from the source.
    const program = (node: TSESTree.Program) => {
      for (const c of context.sourceCode.getAllComments()) {
        checkDash(c, c.value);
      }
      void node;
    };

    return {
      Program: program,
      JSXText(node) {
        checkDash(node, node.value);
        if (node.value.includes(SEMI)) {
          context.report({ node, messageId: "semi" });
        }
      },
      Literal(node) {
        if (typeof node.value === "string") checkDash(node, node.value);
      },
      TemplateElement(node) {
        checkDash(node, node.value.raw);
      },
    };
  },
});
