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
(function () {
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
    query('index', 'Invalid integer value').optional()
      .isWhitelisted('0123456789'),
    query('index', 'Invalid integer value').optional()
      .isInt(),
    query('lock').optional()
      .custom(function (value, { req }) {
        if (!('index' in req.query)) {
          throw new Error('Missing parameter: index');
        }
        return true;
      }),
    query('lock', 'Allowed values 0 or 1').optional()
      .isWhitelisted('01'),
    query('lock', 'Invalid integer value').optional()
      .isInt(),
    //
    // sanitize input
    //
    query(['index', 'lock']).optional()
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
        'name',
        'host',
        'port',
        'tls',
        'verify',
        'password',
        'identifyNick',
        'identifyCommand',
        'nick',
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
    body(['index'], 'Property index not allowed, generated by server')
      .not().exists(),
    //
    //
    // Validate required keys
    //
    body([
      'name',
      'host',
      'port',
      'tls',
      'verify',
      'password',
      'identifyNick',
      'identifyCommand',
      'nick',
      'user',
      'real',
      'modes',
      'channelList'], 'Required values')
      .exists(),

    //
    // validate input
    //
    oneOf([
      body('host', 'Invalid server address').isFQDN(),
      body('host', 'invalid server address').isIP()
    ]),
    body('port', 'Invalid socket port number')
      .isPort(),
    body(['tls', 'verify'])
      .isBoolean(),
    // TODO max length of strings?
    body([
      'name',
      'nick',
      'user'], 'Require type String and not empty string')
      .isString()
      .notEmpty(),
    body([
      'password',
      'identifyNick',
      'identifyCommand',
      'real',
      'modes',
      'channelList'], 'Require type String')
      .isString(),
    //
    // sanitize input
    //
    body(['port'])
      .toInt(),
    body([
      'tls',
      'verify'])
      .toBoolean(),
    body([
      'name',
      'host',
      'password',
      'identifyNick',
      'identifyCommand',
      'nick',
      'user',
      'real',
      'modes',
      'channelList'])
      // remove starting and ending whitespace
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
        'name',
        'host',
        'port',
        'tls',
        'verify',
        'password',
        'identifyNick',
        'identifyCommand',
        'nick',
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
      'index'], 'Required values')
      .exists(),
    body([
      'index',
      'name',
      'host',
      'port',
      'tls',
      'verify',
      'password',
      'identifyNick',
      'identifyCommand',
      'nick',
      'user',
      'real',
      'modes',
      'channelList'], 'Required values')
      .exists(),

    //
    // validate input
    //
    query('index', 'Invalid integer value').optional()
      .isWhitelisted('0123456789'),
    query('index', 'Invalid integer value').optional()
      .isInt(),
    body('index', 'Invalid integer value').optional()
      .isWhitelisted('0123456789'),
    body('index', 'Invalid integer value').optional()
      .isInt(),
    oneOf([
      body('host', 'Invalid server address').isFQDN(),
      body('host', 'invalid server address').isIP()
    ]),
    body('port', 'Invalid socket port number')
      .isPort(),
    body(['tls', 'verify'])
      .isBoolean(),
    // TODO max length of strings?
    body([
      'name',
      'nick',
      'user'], 'Require type String and not empty string')
      .isString()
      .notEmpty(),
    body([
      'password',
      'identifyNick',
      'identifyCommand',
      'real',
      'modes',
      'channelList'], 'Require type String')
      .isString(),
    //
    // sanitize input
    //
    query(
      'index')
      .toInt(),
    body([
      'index',
      'port'])
      .toInt(),
    body([
      'tls',
      'verify'])
      .toBoolean(),
    body([
      'name',
      'host',
      'password',
      'identifyNick',
      'identifyCommand',
      'nick',
      'user',
      'real',
      'modes',
      'channelList'])
      // remove starting and ending whitespace
      .trim(),
    //
    // On error return status 422 Unprocessable Entity
    //
    handleValidationError
  ]; // update

  // ----------------------------
  // DELETE (destroy) (URL query selectors)
  // ----------------------------

  /**
   * @type {Array} destroy - array containing express middleware functions
   */
  const destroy = [
    //
    // Validate extrneous keys
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
        'name',
        'host',
        'port',
        'tls',
        'verify',
        'password',
        'identifyNick',
        'identifyCommand',
        'nick',
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
    query('index', 'is required URL query param')
      .exists(),
    query('index', 'is required body param')
      .exists(),
    //
    //
    // Validate forbidden keys
    //

    //
    // validate input
    //
    query('index', 'Invalid integer value').optional()
      .isWhitelisted('0123456789'),
    query('index', 'Invalid integer value').optional()
      .isInt(),
    query('index', 'Invalid integer value').optional()
      .isInt(),
    query('index').optional()
      .custom(function (value, { req }) {
        if (parseInt(req.query.index) !== parseInt(req.body.index)) {
          throw new Error('Values not match: query index, body index');
        }
        return true;
      }),
    //
    // sanitize input
    //
    query(['index']).optional()
      .toInt(),
    body(['index']).optional()
      .toInt(),
    //
    // On error return status 422 Unprocessable Entity
    //
    handleValidationError
  ]; // destroy

  module.exports = {
    list: list,
    create: create,
    update: update,
    destroy: destroy
  };
})();
