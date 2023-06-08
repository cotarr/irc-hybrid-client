'use strict';
//
// Error handler for express-valiation
//

import { validationResult } from 'express-validator';

// const nodeEnv = process.env.NODE_ENV || 'development';

// ---------------------------------------------------
// Updated to handle both express-validator errors
// and custom errors in single response
// ---------------------------------------------------

export const handleError = function (req, res, next) {
  const allErrors = [];

  // First, errors from express-validator
  const validatorErrors = validationResult(req).array();
  // console.log(validatorErrors);
  for (const err of validatorErrors) {
    allErrors.push(err);
  }

  // Second add custom errors from req.locals.errors
  if (!req.locals) req.locals = {};
  if (!req.locals.errors) req.locals.errors = [];
  const customErrors = req.locals.errors;
  // console.log(customErrors);
  for (const err of customErrors) {
    allErrors.push(err);
  }

  // return the error
  if (allErrors.length > 0) {
    return res.status(422).json({
      status: 422,
      message: 'Unprocessable Entity',
      errors: allErrors
    });
  } else {
    next();
  }
};

// -----------------------------------------------
// THIS IS NOT MIDDLEWARE (simple function)
// check all keys in query object, extraneous keys are error
//
// Accepts req.query or req.body or req.params as checkObject
//
// modifies req object
//
// returns null
//
//  location = string with 'query', 'params', or 'body'.
//
//  location = array with values optional: ['query', 'params', 'body'];
//
// Calling function:
//     function(req, res, next) {
//       checkExtraneousKeys(req, allowedKeys, location);
//       next();
//     },
// -------------------------------------------------

export const checkExtraneousKeys = function (req, allowKeys, location) {
  let locationArray = [];
  if (Array.isArray(location)) {
    locationArray = location;
  }
  if (typeof location === 'string') {
    locationArray.push(location);
  }

  if (!req.locals) req.locals = {};
  if (!req.locals.errors) req.locals.errors = [];

  function checkKeys (checkObject, locationString) {
    const keys = Object.keys(checkObject);
    for (const key of keys) {
      if (allowKeys.indexOf(key) < 0) {
        req.locals.errors.push({
          type: 'field',
          msg: 'Invalid param',
          path: key,
          location: locationString
        });
      }
    }
  }

  if (locationArray.indexOf('query') >= 0) {
    checkKeys(req.query, 'query');
  }

  if (locationArray.indexOf('params') >= 0) {
    checkKeys(req.params, 'params');
  }

  if (locationArray.indexOf('body') >= 0) {
    checkKeys(req.body, 'body');
  }

  if (locationArray.indexOf('noquery') >= 0) {
    const queryKeys = Object.keys(req.query);
    for (const key of queryKeys) {
      req.locals.errors.push({
        type: 'field',
        msg: 'Invalid param',
        path: key,
        location: 'query'
      });
    } // next key
  } // if noquery
};
