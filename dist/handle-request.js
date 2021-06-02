"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = handleRequest;

var _isFunction = _interopRequireDefault(require("lodash/fp/isFunction"));

var _lowerCase = _interopRequireDefault(require("lodash/fp/lowerCase"));

var _findLast = _interopRequireDefault(require("lodash/fp/findLast"));

var _chalk = _interopRequireDefault(require("chalk"));

var _sleep = _interopRequireDefault(require("./sleep"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const {
  URL
} = require('url');

const consolePrefix = `[${_chalk.default.blue('pptr-mock-server')}]`;

function formatRequest(request) {
  return _chalk.default.green(`${request.method()} ${request.url()}`);
}

function warn(message) {
  console.warn(`${consolePrefix} [warning] ${message}`);
}

async function handleRequest(request, {
  baseAppUrl,
  baseApiUrl,
  onRequest,
  onAppRequest,
  onApiRequest
}, handlers) {
  const requestUrlStr = request.url();
  const requestUrl = new URL(requestUrlStr);
  const requestPath = requestUrl.origin + requestUrl.pathname;
  const handler = (0, _findLast.default)(handler => {
    // checking for both `requestUrlStr` and `requestPath` allows to register
    // both fully-qualified URLs if you need better control, or "short" versions
    // with just path. Example: if you register handler as `http://foo`, it will
    // be matched against both `http://foo` and `http://foo?query`. But if you
    // register handler as `http://foo?query` it won't be matched against
    // `http://foo`.
    const urlMatch = handler.endpoint === requestUrlStr || handler.endpoint === requestPath;
    return urlMatch && (0, _lowerCase.default)(request.method()) === (0, _lowerCase.default)(handler.method);
  })(handlers);

  if (handler) {
    const {
      status,
      options
    } = handler;
    let {
      body
    } = options;
    body = (0, _isFunction.default)(body) ? await body(request) : body;

    if (options.delay) {
      await (0, _sleep.default)(options.delay);
    }

    if (options.abort) {
      request.abort(options.abort);
    } else {
      request.respond({
        status,
        contentType: options.contentType || 'application/json',
        body: JSON.stringify(body),
        headers: {
          'access-control-allow-origin': baseAppUrl
        }
      });
    }
  } else if (requestUrlStr.startsWith(baseApiUrl)) {
    let apiRequestHandled;

    if (onApiRequest) {
      apiRequestHandled = onApiRequest(request);
    }

    if (!apiRequestHandled) {
      warn(`Unhandled api request! ${formatRequest(request)}. Responding with 200 OK {}.`);
      request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
        headers: {
          'access-control-allow-origin': baseAppUrl,
          'access-control-allow-headers': 'Authorization, Content-Type'
        }
      });
    }

    return true;
  } else if (requestUrlStr.startsWith(baseAppUrl) || requestUrlStr.startsWith('data:')) {
    let appRequestHandled;

    if (onAppRequest) {
      appRequestHandled = onAppRequest(request);
    }

    if (!appRequestHandled) {
      request.continue();
    }
  } else {
    let requestHandled;

    if (onRequest) {
      requestHandled = onRequest(request);
    }

    if (!requestHandled) {
      warn(`Unhandled external request! ${formatRequest(request)}. Aborting.`);
      request.abort();
    }
  }
}