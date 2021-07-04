module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    node: true
  },
  extends: [
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 12
  },
  rules: {
    // Customize eslint standard style definitions
    'comma-dangle': ['error', 'never'],
    'linebreak-style': ['error', 'unix'],
    'max-len': ['error', { code: 100, tabWidth: 2, ignoreUrls: true }],
    semi: ['error', 'always'],

    // Temporary bypass on javascript rules
    // Need to test this first, then begin code changes to match linter.
    // First pass is to address simple syntax, like missing spaces and extra lines.
    // No code change in the first pass, give clean lint with following disabled.

    // First lint - issues in both browser and nodejs
    'prefer-const': 'off',
    'no-constant-condition': 'off',
    'no-extra-bind': 'off',
    'no-undef': 'off',
    'no-unreachable': 'off',
    'no-unused-vars': 'off',
    'no-useless-return': 'off',
    'no-var': 'off',
    'node/handle-callback-err': 'off',

    // First lint issues in browser code
    'no-case-declarations': 'off',
    'no-useless-escape': 'off',

    // First lint issues nodejs server code
    'dot-notation': 'off',
    'no-dupe-keys': 'off',
    'no-redeclare': 'off',
    'no-useless-escape': 'off',
    'object-property-newline': 'off'
  }
};
