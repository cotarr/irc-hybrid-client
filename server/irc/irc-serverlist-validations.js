// MIT License
//
// Copyright (c) 2022 Dave Bolenbaugh
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
// -----------------------------------------------------------------------------
//
//        Input Validation for IRC Server List Editor API
//
// -----------------------------------------------------------------------------
'use-strict';

const handleValidationError = require('../middlewares/validation-error').handleError;
const checkExtraneousKeys = require('../middlewares/validation-error').checkExtraneousKeys;
const { query, body, oneOf } = require('express-validator');

// const whiteListChars = 'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';

// ----------------------------
// list (URL query selectors)
// ----------------------------

/**
 * @type {Array} list - array containing express middleware functions
 */
const list = [
  //
  // Validate extraneous keys
  //
  function (req, res, next) {
    checkExtraneousKeys(req, [
      'index',
      'lock'
    ], 'query');
    next();
  },
  //
  // Validate required keys
  //

  //
  // Validate forbidden keys
  //

  //
  // validate input
  //
  query('index')
    .optional()
    .isWhitelisted('0123456789')
    .withMessage('Invalid integer value'),
  query('index')
    .optional()
    .isInt()
    .withMessage('Invalid integer value'),
  query('lock')
    .optional()
    .custom(function (value, { req }) {
      if (!('index' in req.query)) {
        throw new Error('Missing parameter: index');
      }
      return true;
    }),
  query('lock')
    .optional()
    .isWhitelisted('01')
    .withMessage('Allowed values 0 or 1'),
  query('lock')
    .optional()
    .isInt()
    .withMessage('Invalid integer value'),
  //
  // sanitize input
  //
  query(['index', 'lock'])
    .optional()
    .toInt(),
  //
  // On error return status 422 Unprocessable Entity
  //
  handleValidationError
]; // list

// ----------------------------
// POST (create)
// ----------------------------

/**
 * @type {Array} create - array containing express middleware functions
 */
const create = [
  //
  // Validate extraneous keys
  //
  function (req, res, next) {
    checkExtraneousKeys(req, [
      'index',
      'disabled',
      'group',
      'name',
      'host',
      'port',
      'tls',
      'verify',
      'proxy',
      'reconnect',
      'logging',
      'password',
      'saslUsername',
      'saslPassword',
      'identifyNick',
      'identifyCommand',
      'nick',
      'altNick',
      'recoverNick',
      'user',
      'real',
      'modes',
      'channelList'
    ], ['body', 'noquery']);
    next();
  },
  //
  //
  // Validate forbidden keys
  //
  body(['index'])
    .not().exists()
    .withMessage('Property index not allowed, generated by server'),
  //
  //
  // Validate required keys
  //
  body([
    'disabled',
    'group',
    'name',
    'host',
    'port',
    'tls',
    'verify',
    'proxy',
    'reconnect',
    'logging',
    'saslUsername',
    'identifyNick',
    'nick',
    'altNick',
    'recoverNick',
    'user',
    'real',
    'modes',
    'channelList'])
    .exists()
    .withMessage('Required value'),

  //
  // validate input
  //
  oneOf([
    body('host')
      .isFQDN()
      .withMessage('Expect: FQDN'),
    body('host')
      .isIP()
      .withMessage('Expect: IP')
  ], { message: 'Host must be domain name or IP' }),
  body('group')
    .isInt({ min: 0, max: 9999 })
    .withMessage('Server group requires type positive integer'),
  body('port')
    .isPort()
    .withMessage('Invalid socket port number'),
  body([
    'disabled',
    'tls',
    'verify',
    'proxy',
    'reconnect',
    'logging',
    'recoverNick'])
    .isBoolean()
    .withMessage('Expect Boolean'),
  // TODO max length of strings?
  body([
    'name',
    'nick',
    'user',
    'real'])
    .notEmpty()
    .withMessage('No empty strings')
    .isString()
    .withMessage('Require type string')
    .isLength({ min: 0, max: 255 })
    .withMessage('Invalid string length'),
  body([
    'password',
    'saslPassword',
    'identifyCommand'])
    .optional()
    .isString()
    .withMessage('Require type string')
    .isLength({ min: 0, max: 255 })
    .withMessage('Invalid string length'),
  body([
    'saslUsername',
    'identifyNick',
    'altNick',
    'modes',
    'channelList'])
    .isString()
    .withMessage('Require type string')
    .isLength({ min: 0, max: 255 })
    .withMessage('Invalid string length'),
  //
  // sanitize input
  //
  body([
    'group',
    'port'])
    .toInt(),
  body([
    'disabled',
    'tls',
    'verify',
    'proxy',
    'reconnect',
    'logging',
    'recoverNick'])
    .toBoolean(),
  body([
    'name',
    'host',
    'saslUsername',
    'identifyNick',
    'nick',
    'altNick',
    'user',
    'real',
    'modes',
    'channelList'])
    // remove starting and ending whitespace
    .trim(),
  body([
    'password',
    'saslPassword',
    'identifyCommand'])
    // remove starting and ending whitespace
    .optional()
    .trim(),
  //
  // On error return status 422 Unprocessable Entity
  //
  handleValidationError
]; // create

// ----------------------------
// PATCH (update)
// ----------------------------

/**
 * @type {Array} update - array containing express middleware functions
 */
const update = [
  //
  // Validate extraneous keys
  //
  function (req, res, next) {
    checkExtraneousKeys(req, [
      'index'
    ], ['query']);
    next();
  },
  function (req, res, next) {
    checkExtraneousKeys(req, [
      'index',
      'disabled',
      'group',
      'name',
      'host',
      'port',
      'tls',
      'verify',
      'proxy',
      'reconnect',
      'logging',
      'password',
      'saslUsername',
      'saslPassword',
      'identifyNick',
      'identifyCommand',
      'nick',
      'altNick',
      'recoverNick',
      'user',
      'real',
      'modes',
      'channelList'
    ], ['body']);
    next();
  },
  //
  // Validate forbidden keys
  //

  //
  //
  // Validate required keys
  //
  query([
    'index'])
    .exists()
    .withMessage('Required value'),
  body([
    'index',
    'disabled',
    'group',
    'name',
    'host',
    'port',
    'tls',
    'verify',
    'proxy',
    'reconnect',
    'logging',
    'saslUsername',
    'identifyNick',
    'nick',
    'altNick',
    'recoverNick',
    'user',
    'real',
    'modes',
    'channelList'])
    .exists()
    .withMessage('Required value'),

  //
  // validate input
  //
  query('index')
    .optional()
    .isWhitelisted('0123456789')
    .withMessage('Invalid integer value'),
  query('index')
    .optional()
    .isInt()
    .withMessage('Invalid integer value'),
  body('index')
    .optional()
    .isWhitelisted('0123456789')
    .withMessage('Invalid integer value'),
  body('index')
    .optional()
    .isInt()
    .withMessage('Invalid integer value'),
  oneOf([
    body('host')
      .isFQDN()
      .withMessage('Expect: FQDN'),
    body('host')
      .isIP()
      .withMessage('Expect: IP')
  ], { message: 'Host must be domain name or IP' }),
  body('group')
    .isInt({ min: 0, max: 9999 })
    .withMessage('Server group requires type positive integer <= 9999'),
  body('port')
    .isPort()
    .withMessage('Invalid socket port number'),
  body([
    'disabled',
    'tls',
    'verify',
    'proxy',
    'reconnect',
    'logging',
    'recoverNick'])
    .isBoolean()
    .withMessage('Expect Boolean'),
  // TODO max length of strings?
  body([
    'name',
    'nick',
    'user',
    'real'], 'Require type String, not empty string')
    .notEmpty()
    .withMessage('No empty strings')
    .isString()
    .withMessage('Require type string')
    .isLength({ min: 0, max: 255 })
    .withMessage('Invalid string length'),
  body([
    'password',
    'saslPassword',
    'identifyCommand'])
    .optional()
    .isString()
    .withMessage('Require type string')
    .isLength({ min: 0, max: 255 })
    .withMessage('Invalid string length'),
  body([
    'saslUsername',
    'identifyNick',
    'altNick',
    'modes',
    'channelList'])
    .isString()
    .withMessage('Require type string')
    .isLength({ min: 0, max: 255 })
    .withMessage('Invalid string length'),

  //
  // sanitize input
  //
  query(
    'index')
    .toInt(),
  body([
    'index',
    'group',
    'port'])
    .toInt(),
  body([
    'disabled',
    'tls',
    'verify',
    'proxy',
    'reconnect',
    'logging',
    'recoverNick'])
    .toBoolean(),
  body([
    'name',
    'host',
    'saslUsername',
    'identifyNick',
    'nick',
    'altNick',
    'user',
    'real',
    'modes',
    'channelList'])
    // remove starting and ending whitespace
    .trim(),
  body([
    'password',
    'saslPassword',
    'identifyCommand'])
    // remove starting and ending whitespace
    .optional()
    .trim(),
  //
  // On error return status 422 Unprocessable Entity
  //
  handleValidationError
]; // update

// ----------------------------
// Copy (URL query selector)
// ----------------------------

/**
 * @type {Array} copy - array containing express middleware functions
 */
const copy = [
  //
  // Validate extraneous keys
  //
  function (req, res, next) {
    checkExtraneousKeys(req, [
      'index'
    ], 'query');
    next();
  },
  function (req, res, next) {
    checkExtraneousKeys(req, [
      'index',
      'disabled',
      'group',
      'name',
      'host',
      'port',
      'tls',
      'verify',
      'proxy',
      'reconnect',
      'logging',
      'password',
      'saslUsername',
      'saslPassword',
      'identifyNick',
      'identifyCommand',
      'nick',
      'altNick',
      'recoverNick',
      'user',
      'real',
      'modes',
      'channelList'
    ], 'body');
    next();
  },
  //
  // Validate required keys
  //
  query('index')
    .exists()
    .withMessage('Required URL query param'),
  body([
    'index'])
    .exists()
    .withMessage('Required body param'),
  //
  //
  // Validate forbidden keys
  //

  //
  // validate input
  //
  query('index')
    .optional()
    .isWhitelisted('0123456789')
    .withMessage('Invalid integer value'),
  query('index')
    .optional()
    .isInt()
    .withMessage('Invalid integer value'),
  query('index')
    .optional()
    .isInt()
    .withMessage('Invalid integer value'),
  query('index')
    .optional()
    .custom(function (value, { req }) {
      if (parseInt(req.query.index) !== parseInt(req.body.index)) {
        throw new Error('Values not match: query index, body index');
      }
      return true;
    }),
  //
  // sanitize input
  //
  query(['index'])
    .optional()
    .toInt(),
  body(['index'])
    .optional()
    .toInt(),
  //
  // On error return status 422 Unprocessable Entity
  //
  handleValidationError
]; // copy

// ----------------------------
// DELETE (destroy) (URL query selectors)
// ----------------------------

/**
 * @type {Array} destroy - array containing express middleware functions
 */
const destroy = [
  //
  // Validate extraneous keys
  //
  function (req, res, next) {
    checkExtraneousKeys(req, [
      'index'
    ], 'query');
    next();
  },
  function (req, res, next) {
    checkExtraneousKeys(req, [
      'index',
      'disabled',
      'group',
      'name',
      'host',
      'port',
      'tls',
      'verify',
      'proxy',
      'reconnect',
      'logging',
      'password',
      'saslUsername',
      'saslPassword',
      'identifyNick',
      'identifyCommand',
      'nick',
      'altNick',
      'recoverNick',
      'user',
      'real',
      'modes',
      'channelList'
    ], 'body');
    next();
  },
  //
  // Validate required keys
  //
  query('index')
    .exists()
    .withMessage('Required URL query param'),
  body('index')
    .exists()
    .withMessage('Required body param'),
  //
  //
  // Validate forbidden keys
  //

  //
  // validate input
  //
  query('index')
    .optional()
    .isWhitelisted('0123456789')
    .withMessage('Invalid integer value'),
  query('index')
    .optional()
    .isInt()
    .withMessage('Invalid integer value'),
  body('index')
    .optional()
    .isInt()
    .withMessage('Invalid integer value'),
  query('index')
    .optional()
    .custom(function (value, { req }) {
      if (parseInt(req.query.index) !== parseInt(req.body.index)) {
        throw new Error('Values not match: query index, body index');
      }
      return true;
    }),
  //
  // sanitize input
  //
  query(['index'])
    .optional()
    .toInt(),
  body(['index'])
    .optional()
    .toInt(),
  //
  // On error return status 422 Unprocessable Entity
  //
  handleValidationError
]; // destroy

// ----------------------------
// tools
// ----------------------------

/**
 * @type {Array} tools - array containing express middleware functions
 */
const tools = [
  //
  // Validate extraneous keys
  //
  function (req, res, next) {
    checkExtraneousKeys(req, [
      'index'
    ], 'query');
    next();
  },
  function (req, res, next) {
    checkExtraneousKeys(req, [
      'index',
      'disabled',
      'action',
      'group',
      'name',
      'host',
      'port',
      'tls',
      'verify',
      'proxy',
      'reconnect',
      'logging',
      'password',
      'saslUsername',
      'saslPassword',
      'identifyNick',
      'identifyCommand',
      'nick',
      'altNick',
      'recoverNick',
      'user',
      'real',
      'modes',
      'channelList'
    ], 'body');
    next();
  },
  //
  // Validate required keys
  //
  query('index')
    .exists()
    .withMessage('Required URL query param'),
  body([
    'index',
    'action'])
    .exists()
    .withMessage('Required body param'),
  //
  //
  // Validate forbidden keys
  //

  //
  // validate input
  //
  query('index')
    .optional()
    .isWhitelisted('0123456789')
    .withMessage('Invalid integer value'),
  query('index')
    .optional()
    .isInt()
    .withMessage('Invalid integer value'),
  query('index')
    .optional()
    .isInt()
    .withMessage('Invalid integer value'),
  query('index')
    .optional()
    .custom(function (value, { req }) {
      if (parseInt(req.query.index) !== parseInt(req.body.index)) {
        throw new Error('Values not match: query index, body index');
      }
      return true;
    }),
  body(['action'])
    .isString()
    .withMessage('Require type String')
    .isLength({ min: 0, max: 255 })
    .withMessage('Invalid string length'),
  oneOf([
    body('action')
      .equals('move-up')
      .withMessage('Expect: move-up'),
    body('action')
      .equals('toggle-disabled')
      .withMessage('Expect: toggle-disabled')
  ], { message: 'Unrecognized editor action value' }),
  //
  // sanitize input
  //
  query(['index'])
    .optional()
    .toInt(),
  body(['index'])
    .optional()
    .toInt(),
  body('action')
    // remove starting and ending whitespace
    .trim(),
  //
  // On error return status 422 Unprocessable Entity
  //
  handleValidationError
]; // tools

module.exports = {
  list: list,
  create: create,
  update: update,
  copy: copy,
  destroy: destroy,
  tools: tools
};
