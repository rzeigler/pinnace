"use strict";

const Promise = require("bluebird");
const http = require("http");
const https = require("https");
const url = require("url");
const qs = require("querystring");
const L = require("partial.lenses");
const R = require("ramda");

// Lenses against the options object
const optVerb = L.prop("method");
const optHeaders = L.compose(L.prop("headers"), L.defaults({}));
const optPath = L.compose(L.prop("path"), L.defaults("/"));
const optBody = L.prop("body");
const optProtocol = L.prop("protocol");

const resHeaders = L.prop("headers");
const resHeader = R.curry((key, res) => {
    const optic = L.compose(resHeaders, L.prop(key.toLowerCase()));
    return L.get(optic, res);
});
const resStatusCode = L.get(L.prop("statusCode"));
const resBody = L.get(L.prop("body"));

const verb = L.set(optVerb);
const get = verb("GET");
const put = verb("PUT");
const post = verb("POST");
const del = verb("DELETE");

// String -> Options -> Options
const resource = R.curry((path, opts) =>
    R.merge(opts, R.pick(["protocol", "host", "path"], url.parse(path)))
);

const updatePath = R.curry((dict, path) =>
    R.keys(dict).length === 0 ? path :
        `${url.parse(path).pathname}?${qs.encode(dict)}`
);

const search = R.curry((dict, opts) => L.modify(
    optPath,
    updatePath(dict),
    opts
));

const header = R.curry((key, value, opts) => L.set(
    L.compose(optHeaders, L.prop(key)),
    value,
    opts
));

const accept = header("Accept");
const acceptJson = accept("application/json; charset=utf8");
const acceptText = accept("text/plain");
const acceptHtml = accept("text/html");

const contentType = header("Content-Type");
const contentTypeJson = contentType("application/json; charset=utf8");
const contentTypeText = contentType("text/plain");

const contentLength = header("Content-Length");

const agent = L.set(L.prop("agent"));

const body = L.set(optBody);

// [Options -> Options] -> Options
const dsl = (exprs) =>
    R.reduce(R.pipe, R.identity, exprs)({});

const selectBackend = (proto) => {
    switch (proto) {
    case "http:":
        return http;
    case "https:":
        return https;
    default:
        throw new Error(`Unrecognized proto ${proto}`);
    }
};

const pickResponseProps = R.pick([
    "headers",
    "httpVersion",
    "rawHeaders",
    "rawTrailers",
    "statusCode",
    "statusMessage"
]);

const withContentLength = (config) => {
    const body = L.get(optBody, config);
    return body ? contentLength(body.length.toString(), config) : config;
};

const request = R.curry((dslExprs) => {
    const opts = withContentLength(dsl(dslExprs)),
        proto = L.get(optProtocol, opts),
        body = L.get(optBody, opts),
        backend = selectBackend(proto);
    return new Promise((resolve, reject) => {
        const req = backend.request(opts, (res) => {
            const details = pickResponseProps(res);
            const results = [];
            res.on("data", (chunk) => {
                results.push(chunk);
            });
            res.on("end", () => {
                const body = results.length === 0 ? null : Buffer.concat(results);
                if (details.statusCode >= 200 && details.statusCode < 400) {
                    resolve(R.merge(details, {body, request: opts}));
                } else {
                    reject(R.merge(details, {body, request: opts}));
                }
            });
        });
        req.on("error", reject);
        if (body) {
            req.write(body);
        }
        req.end();
    });
});

const defaultRequestFactory = R.curry((defaults, dslExprs) => request(R.concat(defaults, dslExprs)));

module.exports = {
    verb,
    get,
    put,
    post,
    del,
    resource,
    search,
    header,
    accept,
    acceptJson,
    acceptText,
    acceptHtml,
    body,
    contentType,
    contentTypeJson,
    contentTypeText,
    agent,
    dsl,
    request,
    defaultRequestFactory,
    resHeader,
    resBody,
    resStatusCode
};
