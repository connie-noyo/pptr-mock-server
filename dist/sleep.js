"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _default = ms => new Promise(res => setTimeout(res, ms));

exports.default = _default;