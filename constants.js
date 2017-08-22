"use strict";

const verbs = ["GET", "PUT", "POST", "DELETE", "PATCH", "HEAD"];
const statusCodeErrorName = "StatusCodeError";
const streamReadErrorName = "StreamReadError";
const configurationErrorName = "ConfigurationError";

module.exports = {
    verbs,
    statusCodeErrorName,
    streamReadErrorName,
    configurationErrorName
};
