import js from "@eslint/js";
import eslintReact from "@eslint-react/eslint-plugin";

export default [
  js.configs.recommended,
  eslintReact.configs.recommended,
  {
    rules: {
      // your rules
    },
  },
];
