import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: {
        node: true,
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    rules: {
      // General JavaScript rules
      'prefer-const': 'warn',
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'no-debugger': 'off',
      'no-empty': 'warn',
      'no-irregular-whitespace': 'warn',
      'no-case-declarations': 'warn',
      'no-fallthrough': 'warn',
      'no-mixed-spaces-and-tabs': 'error',
      'no-redeclare': 'error',
      'no-undef': 'error',
      'no-unreachable': 'warn',
      'no-useless-escape': 'warn',
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
      'indent': ['error', 2],
    },
  },
];