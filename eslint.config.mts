import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import tseslint from "typescript-eslint";

import { customRules } from "./eslint-rules/index";

/**
 * ESLint, the library subset of the ledgerloop config. Prettier owns formatting;
 * this owns what tsc can't: cast/null/any hygiene (no `any`, no bare `!`, no `as T`
 * except `as const`), dead-logic checks, type style, and the em-dash ban. The
 * Next/app-specific rules (logger, API routes, no-index-files, a11y) are dropped:
 * a published package legitimately has a public `src/index.ts` barrel.
 */
export default tseslint.config(
  {
    // The demo is a separate sub-project with its own toolchain; don't lint it here.
    ignores: ["dist/**", "node_modules/**", "demo/**"],
  },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  {
    files: ["**/*.{ts,tsx,mts}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      custom: customRules,
    },
    rules: {
      // Cast / null / any hygiene.
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-unsafe-type-assertion": "error",
      "@typescript-eslint/no-unnecessary-condition": "error",

      // Type style.
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],

      // Async safety.
      "@typescript-eslint/no-floating-promises": "error",

      // Style.
      "func-style": ["error", "expression", { allowArrowFunctions: true }],
      "prefer-arrow-callback": "error",
      "no-restricted-syntax": [
        "error",
        {
          // Ban every `as T` cast (except `as const`). Narrow with a guard or use
          // `satisfies`. A necessary boundary cast takes a per-line eslint-disable
          // with a reason.
          selector:
            "TSAsExpression:not([typeAnnotation.typeName.name='const'])",
          message:
            "Avoid `as T`. Narrow with a type guard or use `satisfies`. Annotate a necessary boundary cast with an eslint-disable + reason.",
        },
      ],

      // Custom rules.
      "custom/no-emdash-in-text": "error",
    },
  },

  // The custom rule's own file documents the em/en-dash by using them; don't lint
  // the rule authoring against itself.
  {
    files: ["eslint-rules/**/*.ts"],
    rules: { "custom/no-emdash-in-text": "off" },
  },

  // Tests: `!`, `any`, and `as` casts on just-built fixtures are provably safe;
  // relax the ceremony rules (the assertion and logic ones stay meaningful elsewhere).
  {
    files: ["test/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "no-restricted-syntax": "off",
      "@typescript-eslint/no-unsafe-type-assertion": "off",
    },
  },

  // Prettier last, turn off all formatting rules.
  prettierConfig,
);
