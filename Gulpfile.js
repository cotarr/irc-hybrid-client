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
// Clean secure-minify folder
//
const clean = function() {
  return del(
    [
      'secure-minify'
    ],
    {dryRun: false});
};

const htmlMinify = function() {
  return src('secure/webclient.html')
    // these files have been bundled into one file, so they are being removed
    .pipe(replace('<script src="./js/webclient02.js" defer></script>', ''))
    .pipe(replace('<script src="./js/webclient03.js" defer></script>', ''))
    .pipe(replace('<script src="./js/webclient04.js" defer></script>', ''))
    .pipe(replace('<script src="./js/webclient05.js" defer></script>', ''))
    .pipe(replace('<script src="./js/webclient06.js" defer></script>', ''))
    .pipe(replace('<script src="./js/webclient07.js" defer></script>', ''))
    .pipe(replace('<script src="./js/webclient08.js" defer></script>', ''))
    .pipe(replace('<script src="./js/webclient09.js" defer></script>', ''))
    .pipe(replace('<script src="./js/webclient10.js" defer></script>', ''))
    .pipe(htmlmin(htmlMinifyOptions))
    .pipe(dest('secure-minify'));
};
const jsMinify = function () {
  const license = '/*\n' +
    fs.readFileSync('LICENSE', 'utf8') +
    '*/\n\n';
  return src(
    [
      'secure/js/webclient.js',
      'secure/js/webclient02.js',
      'secure/js/webclient03.js',
      'secure/js/webclient04.js',
      'secure/js/webclient05.js',
      'secure/js/webclient06.js',
      'secure/js/webclient07.js',
      'secure/js/webclient08.js',
      'secure/js/webclient09.js',
      'secure/js/webclient10.js'
    ])
    .pipe(concat('webclient.js'))
    .pipe(minify(jsMinifyOptions))
    .pipe(insert.prepend(license))
    .pipe(dest('secure-minify/js'));
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
    .pipe(cleancss(minifyCssOptions))
    .pipe(dest('secure-minify/css'));
};

// ------------------------------
// copy sound files
// ------------------------------
const soundsCopy = function() {
  return src('secure/sounds/*')
    .pipe(dest('secure-minify/sounds'));
};

//
// default using 'gulp' command
//
const defaultTask = function (cb) {
  console.log('\n\nTo Minify HTML file use: gulp minify\n\n');
  cb();
};

//
// Process Production secure-minify folder
//
const minifyProd = series(
  htmlMinify,
  jsMinify,
  cssMinify,
  soundsCopy
);

exports.default = defaultTask;
exports.clean = clean;
exports.minify = series(clean, minifyProd);
