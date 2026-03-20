// eslint.config.mjs
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  // 1. Global ignores – must be first!
  {
    ignores: [
      ".next/**",
      "dist/**",
      "build/**",
      "node_modules/**",
      "*.min.js",
      "public/**",
    ],
  },

  // 2. Base JS rules
  js.configs.recommended,

  // 3. TypeScript recommended
  ...tseslint.configs.recommended,

  // 4. Prettier + disable conflicting rules
  prettierConfig,

  // 5. Main config for source files
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      prettier,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      "prettier/prettier": "error",
      "no-unused-vars": "warn",
      "no-undef": "warn",
      // Optional suppressions for React 19 warnings (uncomment if too noisy)
      // "@eslint-react/no-forward-ref": "warn",
      // "@eslint-react/component-hook-factories": "warn",
      // "@eslint-react/use-state": "warn",
    },
    settings: {
      react: { version: "detect" },
    },
  },
);
