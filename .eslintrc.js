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
    // Require parenthesis around arrow function argument
    'arrow-parens': 'error',
    'comma-dangle': ['error', 'never'],
    'linebreak-style': ['error', 'unix'],
    'max-len': ['error', { code: 100, tabWidth: 2, ignoreUrls: true }],
    semi: ['error', 'always']
  },
  overrides: [
    {
      files: ['webclient*.js'],
      rules: {
        // For the web browser code, there are
        // 10 JavaScript source files that are
        // cancatenated into a single file file.
        // When the separate files are opened in the editor,
        // then undefined and unused lint errors are generated
        // by items in other files (before concatenate)
        //
        // to view a single file with minify disabled,
        // Comment this line in the Gulpfile.js: ".pipe(minify(jsMinifyOptions))"
        //
        'no-unused-vars': 'off',
        'no-undef': 'off'
      }
    },
    {
      files: ['webclient.js'],
      rules: {
        // for some global stuff in web broswer code
        'no-var': 'off'
      }
    },
    {
      files: ['irc-client-vars.js'],
      rules: {
        // To address state data used in the web server, This module
        // returns an object with property variables defined by "let"
        'prefer-const': 'off'
      }
    }
  ]
};
