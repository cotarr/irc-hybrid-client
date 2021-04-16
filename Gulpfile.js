//
// Gulpfile for irc-hybrid-client
//
const {src, dest, watch, series, parallel} = require('gulp');
const del = require('del');
const concat = require('gulp-concat');
const insert = require('gulp-insert');
const minify = require('gulp-minify');
const htmlmin = require('gulp-htmlmin');
const cleancss = require('gulp-clean-css');
const replace = require('gulp-replace');
const rename = require('gulp-rename');
const fs = require('fs');

// To disable length limit, set maxLineLength = false
const maxLineLength = 200;

const htmlMinifyOptions = {
  minifyCSS: ({
    format: {
      wrapAt: maxLineLength
    }
  }),
  collapseWhitespace: true,
  removeComments: true,
  maxLineLength: maxLineLength
};

const jsMinifyOptions = {
  ext: '.js',
  noSource: true,
  mangle: false,
  compress: false,
  output: {
    max_line_len: maxLineLength
  }
};

const minifyCssOptions = {
  format: {
    wrapAt: maxLineLength
  }
};

//
// Clean build folder
//
const clean = function() {
  return del(
    [
      'build'
    ],
    {dryRun: false});
};

const htmlMinify = function() {
  return src('secure/webclient.html')
    // these files have been bundled into one file, so they are being removed
    .pipe(replace('<script src="./js/webclient2.js" defer></script>', ''))
    .pipe(replace('<script src="./js/webclient3.js" defer></script>', ''))
    .pipe(replace('<script src="./js/webclient4.js" defer></script>', ''))
    .pipe(replace('<script src="./js/webclient5.js" defer></script>', ''))
    .pipe(replace('<script src="./js/webclient6.js" defer></script>', ''))
    .pipe(replace('<script src="./js/webclient7.js" defer></script>', ''))
    .pipe(replace('<script src="./js/webclient8.js" defer></script>', ''))
    .pipe(replace('<script src="./js/webclient9.js" defer></script>', ''))
    // .pipe(htmlmin(htmlMinifyOptions))
    .pipe(dest('build/secure'));
};
const jsMinify = function () {
  const license = '/*\n' +
    fs.readFileSync('LICENSE', 'utf8') +
    '*/\n\n';
  return src(
    [
      'secure/js/webclient.js',
      'secure/js/webclient2.js',
      'secure/js/webclient3.js',
      'secure/js/webclient4.js',
      'secure/js/webclient5.js',
      'secure/js/webclient6.js',
      'secure/js/webclient7.js',
      'secure/js/webclient8.js',
      'secure/js/webclient9.js'
    ])
    .pipe(concat('webclient.js'))
    // .pipe(minify(jsMinifyOptions))
    // .pipe(insert.prepend(license))
    .pipe(dest('build/secure/js'));
};

// -----------
//    CSS
// -----------
const cssMinify = function() {
  return src(
    [
      'secure/css/styles.css'
    ])
    .pipe(concat('styles.css'))
    // .pipe(cleancss(minifyCssOptions))
    .pipe(dest('build/secure/css'));
};

// ------------------------------
// Node/Express Server Files
// ------------------------------

const serverCopy = function() {
  return src('server/**')
    .pipe(dest('build/server'));
};
const binCopy = function() {
  return src('bin/www')
    .pipe(dest('build/bin'));
};

// -----------------
// Package files
// -----------------
const packageCopy = function() {
  return src('package*')
    .pipe(dest('build/'));
};

// ------------------------------
// tools - used to set password
// ------------------------------
const toolsCopy = function() {
  return src('tools/*')
    .pipe(dest('build/tools'));
};

//
// default using 'gulp' command
//
const defaultTask = function (cb) {
  console.log('\n\nTo build use: gulp dist\n\n');
  cb();
};

//
// Process Production build folder
//
const buildProd = series(
  packageCopy,
  htmlMinify,
  jsMinify,
  cssMinify,
  serverCopy,
  binCopy,
  toolsCopy
);

exports.default = defaultTask;
exports.clean = clean;
exports.dist = series(clean, buildProd);
