module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'commonjs',
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
};