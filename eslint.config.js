/**
 * ESLint flat config for Expo (TypeScript + React). Ignores exported web `dist/`.
 * @see https://docs.expo.dev/guides/using-eslint/
 */
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
]);
