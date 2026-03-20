import js from "@eslint/js";
import react from "eslint-plugin-react";

export default [
  js.configs.recommended,
  {
    plugins: { react },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // your rules
    },
  },
];
