/**
 * @type {import("eslint").Linter.Config}
 */
module.exports = {
  root: true,
  extends: [
    'prettier',
    'eslint:recommended',
    'plugin:@typescript-eslint/strict-type-checked',
  ],
  rules: {
    '@typescript-eslint/consistent-type-imports': 2,
    '@typescript-eslint/consistent-type-exports': 2,
    '@typescript-eslint/switch-exhaustiveness-check': 2,
    '@typescript-eslint/no-non-null-assertion': 2,
    '@typescript-eslint/consistent-type-assertions': 2,
    '@typescript-eslint/no-explicit-any': 2,
    '@typescript-eslint/no-extra-semi': 2,
    '@typescript-eslint/prefer-includes': 2,
    '@typescript-eslint/no-unsafe-member-access': 2,
    'no-implicit-coercion': 2,
  },
  plugins: ['@typescript-eslint'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
  },
  ignorePatterns: ['*.config.js', '.eslintrc.js', 'node_modules/**', 'lib/**'],
};
