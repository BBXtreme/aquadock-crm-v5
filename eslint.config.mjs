// eslint.config.mjs
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";
// import tailwind from "eslint-plugin-tailwindcss"; // uncomment if using Tailwind

export default tseslint.config(
  {
    ignores: [".next/**", "dist/**", "build/**", "node_modules/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
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
      // tailwind, // uncomment if needed
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      "prettier/prettier": "error",
      "no-unused-vars": "warn",
      "no-undef": "warn",
      // ...tailwind.configs.recommended.rules, // if added
    },
    settings: {
      react: { version: "detect" },
    },
  },
);
