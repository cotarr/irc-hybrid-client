(function () {
  'use-strict';

  const handleValidationError = require('../middlewares/validation-error').handleError;
  const checkExtraneousKeys = require('../middlewares/validation-error').checkExtraneousKeys;
  const { query, body, param } = require('express-validator');

  const whiteListChars = 'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';

  // ----------------------------
  // list (URL query selectors)
  // ----------------------------

  const list = [
    //
    // Validate extrneous keys
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
  // DELETE (destroy) (URL query selectors)
  // ----------------------------

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
  ]; // list
  module.exports = {
    list: list,
    // create: create,
    // update: update,
    destroy: destroy
  };
})();
