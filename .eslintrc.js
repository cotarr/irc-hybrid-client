/*
 * ESlint configuraion
 *
 * 0 = off
 * 1 = warn
 * 2 = error
 * */
'use strict';

module.exports = {
  env: {
    'browser': true,
    'node': true,
    'es6': true
  },
  globals: {
    'require': true,
    'module': true
  },
  rules: {
    'array-bracket-spacing': ['error', 'never'],
    "arrow-parens": "error",
    'block-spacing': 'error',
    'brace-style': 'error',
    'camelcase': ['error', {properties: 'never'}],
    'comma-dangle': ['error', 'never'],
    'comma-spacing': ['error', {'before': false, 'after': true}],
    'comma-style': ['error', 'last'],
    'computed-property-spacing': ['error', 'never'],
    "curly": ["error", "multi-line"],
    'default-case': 'error',
    'eqeqeq': 'error',
    'indent': ['error', 2, {'SwitchCase': 1}],
    'jsx-quotes': ['error', 'prefer-single'],
    'key-spacing': ['error', {'mode': 'strict'}],
    'linebreak-style': 'error',
    'max-len': ['error', {code: 100, tabWidth: 2, ignoreUrls: true}],
    "no-console": "off",
    'no-irregular-whitespace': ['error', {'skipComments': true, 'skipRegExps': true, 'skipTemplates': true}],
    'no-alert': 'error',
    'no-multi-spaces': 'error',
    'no-use-before-define': 'error',
    'no-mixed-spaces-and-tabs': 'error',
    'no-multiple-empty-lines': ['error', {max: 2}],
    'no-trailing-spaces': 'error',
    'object-curly-spacing': 'error',
    'one-var': ['error', {var: 'never', let: 'never', const: 'never'}],
    'padded-blocks': ['error', 'never'],
    'quote-props': ['error', 'consistent'],
    'quotes': ['error', 'single', {allowTemplateLiterals: true}],
    'semi-spacing': 'error',
    'semi': 'error',
    'space-before-blocks': 'error'
  }
};
