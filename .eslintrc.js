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

    'no-unused-vars': 'off',

    // Temporary bypass on javascript rules

    'prefer-const': 'off',
    'no-constant-condition': 'off',
    // 'no-extra-bind': 'off',
    'no-undef': 'off',
    'no-unreachable': 'off',
    'no-useless-return': 'off',
    'no-var': 'off',
    'node/handle-callback-err': 'off',
    'no-case-declarations': 'off'
    // 'no-useless-escape': 'off'
  },
  overrides: [
    {
      files: ['irc-client-vars.js'],
      rules: {
        'prefer-const': 'off'
      }
    }
  ]
};
