// ESLint 9 flat config. Replaces the old .eslintrc.json, which ESLint 9 no
// longer reads by default — `ng lint` failed with "Could not find config file"
// until this existed.
//
// Deliberately a like-for-like port of the previous .eslintrc.json: Angular's
// recommended TS + template rules and this app's selector/suffix conventions,
// and nothing more. Adding `tseslint.configs.recommended`/`stylistic` or
// `angular.configs.templateAccessibility` is reasonable, but each surfaces
// dozens of pre-existing violations — treat that as its own cleanup pass.
const angular = require('angular-eslint');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    // Build output, native shells, and installed packages are not ours to lint.
    ignores: ['www/**', 'android/**', 'ios/**', 'node_modules/**', 'dist/**']
  },
  {
    files: ['**/*.ts'],
    extends: [...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/component-class-suffix': [
        'error',
        { suffixes: ['Page', 'Component'] }
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' }
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' }
      ]
    }
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended],
    rules: {}
  }
);
