"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const withAndroid_1 = __importDefault(require("./withAndroid"));
const withNitroFetch = (config) => {
    config = (0, withAndroid_1.default)(config);
    return config;
};
exports.default = withNitroFetch;
