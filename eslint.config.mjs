// eslint.config.mjs
import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-plugin-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Global ignores – MUST be first item in array
  {
    name: 'global/ignores',
    ignores: [
      '.next/**',
      'dist/**',
      'build/**',
      'node_modules/**',
      'public/**',
      '*.min.js',
      '**/*.generated.*', // optional – catch any generated files
    ],
  },

  // Base JS rules
  js.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.recommended,

  // Prettier + disable formatting conflicts
  prettierConfig,

  // Main source code config
  {
    name: 'app/source',
    files: ['src/**'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      prettier,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      'prettier/prettier': 'error',
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
      // Suppress noisy React 19 warnings temporarily (uncomment if needed)
      // "@eslint-react/no-forward-ref": "warn",
      // "@eslint-react/component-hook-factories": "warn",
      // "@eslint-react/use-state": "warn",
    },
    settings: {
      react: { version: 'detect' },
    },
  },

  // Supabase types override
  {
    name: 'supabase/types',
    files: ['src/lib/supabase/database.types.ts', 'src/lib/supabase/types.ts'],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  }
);
