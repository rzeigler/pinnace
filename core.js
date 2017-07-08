"use strict";
const url = require("url"); 
const http = require("http");
const https = require("https");
const typeis = require("type-is");
const {Readable} = require("stream");
const {VError} = require("verror");
const {Future} = require("fluture");
const L = require("partial.lenses");
const {compose, composeK, curry, fromPairs, identity, is, map, merge, objOf, pick, omit, pipe, reduce} = require("ramda");

const statusCodeError = "StatusCodeError";
const streamReadError = "StreamReadError";
const configurationErrorName = "ConfigurationError";

const defaultSocketTimeout = 60000;
const optIdleTimeout = L.compose(L.prop("idleTimeout"), L.defaults(defaultSocketTimeout));
const optConnTimeout = L.compose(L.prop("connTimeout"), L.defaults(defaultSocketTimeout));
const optMethod = L.compose(L.prop("method"), L.defaults("GET"));
const optSocketPath = L.prop("socketPath");
const optHeaders = L.prop("headers");
const optHeader = (header) => L.compose(optHeaders, L.defaults({}), L.prop(header));
const optAgent = L.prop("agent");

const resHeader = (header) => L.compose(L.prop("headers"), L.defaults({}), L.prop(header));
const resContentType = L.compose(L.prop("headers"), L.defaults({}), L.prop("content-type"), L.defaults("application/octet-stream"));
const resBuffer = L.prop("buffer");
const resBody = L.prop("body");

const httpForProto = (proto) => {
    if (proto === "http:") {
        return http;
    } else if (proto === "https:") {
        return https;
    } else if (!proto) {
        return http;
    }
    throw new VError({
        name: configurationErrorName,
        info: {proto}
    }, "Unrecognized protocol %s", proto);
};

const send = (req, body) => {
    if (is(Buffer, body)) {
        req.write(body);
        req.end();
    } else if (is(Readable, body)) {
        body.pipe(req);
    } else if (body) {
        throw new VError({
            name: configurationErrorName,
            info: {body}
        }, "Body must be a Buffer or Readable");
    } else {
        req.end();
    }
};

const bufferStream = (stream) => new Future((reject, resolve) => {
    let buffer = null;
    stream.on("data", (chunk) => {
        if (buffer) {
            buffer = Buffer.concat([buffer, chunk]);
        } else {
            buffer = chunk;
        }
    });
    stream.on("end", () => {
        resolve(buffer);
    });
    stream.on("error", (err) => {
        reject(new VError({
            name: streamReadError,
            cause: err
        }, "Unable to read from stream"));
    });
});

const stream = curry((options) => {
    const http = httpForProto(options.proto);
    return new Future((reject, resolve) => {
        const req = http.request(options);
        const abort = () => { req.abort(); };
        req.on("response", (res) => {
            const statusCode = res.statusCode;
            if (statusCode >= 200 && statusCode < 400) {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    bodyStream: res,
                    options
                });
            } else {
                bufferStream(res).fork(
                    (err) => 
                        reject(VError.fromList([
                            new VError({
                                name: statusCodeError,
                                info: {
                                    options,
                                    statusCode,
                                    headers: res.headers
                                }
                            }, `Server responded with ${statusCode}`),
                            err
                        ])),
                    (body) => 
                        reject(new VError({
                            name: statusCodeError,
                            info: {
                                options,
                                statusCode,
                                headers: res.headers,
                                // If the content type is meaninfully decodeable, do so for ease of debugging
                                body: typeis.is(res.headers["content-type"], ["text/*", "application/json", "application/*+json"]) ? 
                                        body.toString("utf8") : body
                            }
                        }, `Server responded with ${statusCode}`)));
            }
        });
        req.on("error", (err) => {
            reject(new VError({
                name: "ConnectionError",
                cause: err
            }, "Unable to communicate with remote server"));
        });
        req.setTimeout(L.get(optIdleTimeout, options), abort);
        send(req, options.body);
        return abort;
    });
});

const bufferResponse = (res) => map(compose(omit(["bodyStream"]), merge(res), objOf("buffer")), bufferStream(res.bodyStream));

const textFormats = [
    "text/*",
    "application/json",
    "application/*+json"
];
const isTextFormat = (type) => typeis.is(type, textFormats);

const decodeResponse = (res) => isTextFormat(L.get(resContentType, res)) ?
    L.set(resBody, L.get(resBuffer, res).toString("utf8"), res) : res;

const method = curry((verb, opts) => L.set(optMethod, verb, opts));
const uriToOptions = compose(pick(["protocol", "auth", "host", "hash", "path"]), url.parse);
const uri = curry((uri, opts) => merge(opts, uriToOptions(uri)));
const socketPath = curry((socket, opts) => L.set(optSocketPath, socket, opts));
const header = curry((header, value, opts) => L.set(optHeader(header), value, opts));
const headers = curry((headers, opts) => L.set(optHeaders, headers, opts));
const agent = curry((agent, opts) => L.set(optAgent, agent, opts));
const connTimeout = curry((timeout, opts) => L.set(optConnTimeout, timeout, opts));
const idleTimeout = curry((timeout, opts) => L.set(optIdleTimeout, timeout, opts));
const conf = (...dsl) => reduce(pipe, identity, dsl)({});
const confs = (dsl) => reduce(pipe, identity, dsl)({});

const request = composeK(compose(Future.of, decodeResponse), bufferResponse, stream);

const requestMethodFactory = curry((requestor, verb) => [verb.toLowerCase(), compose(requestor, L.set(optMethod, verb))]);

const verbs = ["GET", "PUT", "POST", "DELETE", "PATCH", "HEAD"];

const methods = pipe(
    map(requestMethodFactory(request)),
    fromPairs
)(verbs);

const streamMethods = pipe(
    map(requestMethodFactory(stream)),
    fromPairs
)(verbs);

module.exports = merge(methods, {
    stream,
    streaming: streamMethods,
    request,
    method,
    uri,
    socketPath,
    header,
    headers,
    conf,
    confs,
    agent,
    connTimeout,
    idleTimeout,
    resHeader,
    resContentType,
    resBuffer,
    resBody
});
