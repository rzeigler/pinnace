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
const {verbs, statusCodeErrorName, streamReadErrorName, configurationErrorName} = require("./constants");

const defaultSocketTimeout = 60000;
const optIdleTimeout = L.compose(L.prop("idleTimeout"), L.defaults(defaultSocketTimeout));
const optConnTimeout = L.compose(L.prop("connTimeout"), L.defaults(defaultSocketTimeout));
const optMethod = L.compose(L.prop("method"), L.defaults("GET"));
const optSocketPath = L.prop("socketPath");
const optHeaders = L.prop("headers");
const optHeader = (header) => L.compose(optHeaders, L.defaults({}), L.prop(header));
const optAgent = L.prop("agent");

const resHeader = (header) => L.compose(L.prop("headers"), L.defaults({}), L.prop(header));
const resStatusCode = L.prop("statusCode");
const resStatusMessage = L.prop("statusMessage");
const resOptions = L.prop("options");
const resContentType = L.compose(L.prop("headers"), L.defaults({}), L.prop("content-type"), L.defaults("application/octet-stream"));
const resStream = L.prop("stream");
const resBuffer = L.prop("buffer");
const resText = L.prop("text");
const resBody = L.prop("body");

const httpForProto = (protocol) => {
    if (protocol === "http:") {
        return http;
    } else if (protocol === "https:") {
        return https;
    } else if (!protocol) {
        return http;
    }
    throw new VError({
        name: configurationErrorName,
        info: {protocol}
    }, "Unrecognized protocol %s", protocol);
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
            name: streamReadErrorName,
            cause: err
        }, "Unable to read from stream"));
    });
});


const pickResponseFields = pick(["statusCode", "statusMessage", "url", "upgrade", "headers", "httpVersion", "httpVersionMajor", "httpVersionMinor"]);

const stream = curry((options) => {
    const ver = httpForProto(options.protocol);
    return new Future((reject, resolve) => {
        const req = ver.request(options);
        const abort = () => { req.abort(); };
        req.on("response", (res) => {
            const statusCode = res.statusCode;
            if (statusCode >= 200 && statusCode < 400) {
                resolve(merge(pickResponseFields(res), {
                    stream: res,
                    options
                }));
            } else {
                bufferStream(res).fork(
                    (err) => 
                        reject(VError.fromList([
                            new VError({
                                name: statusCodeErrorName,
                                info: merge(pickResponseFields(res), {
                                    options
                                })
                            }, `Server responded with ${statusCode}`),
                            err
                        ])),
                    (buffer) => 
                        reject(new VError({
                            name: statusCodeErrorName,
                            info: merge(pickResponseFields(res), {
                                options,
                                text: typeis.is(res.headers["content-type"], ["text/*", "application/json", "application/*+json"]) ? 
                                        buffer.toString("utf8") : buffer
                            })
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

const bufferResponse = (res) => map(compose(omit(["stream"]), merge(res), objOf("buffer")), bufferStream(res.stream));

const textFormats = [
    "text/*",
    "application/json",
    "application/*+json"
];
const isTextFormat = (type) => typeis.is(type, textFormats);

// Needs to extract the 
const decodeResponse = (res) => isTextFormat(L.get(resContentType, res)) ?
    L.set(resText, L.get(resBuffer, res).toString("utf8"), res) : res;

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

// The decodeResponse probably needs some kind of error reporting on failure beyond whatever gets thrown
const request = composeK(compose(Future.encase(decodeResponse)), bufferResponse, stream);

const requestMethodFactory = curry((requestor, verb) => [verb.toLowerCase(), compose(requestor, L.set(optMethod, verb))]);

const methods = pipe(
    map(requestMethodFactory(request)),
    fromPairs
)(verbs);

const streamMethods = pipe(
    map(requestMethodFactory(stream)),
    fromPairs
)(verbs);

module.exports = merge(methods, {
    httpForProto,
    stream,
    streaming: streamMethods,
    requestMethodFactory,
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
    resStatusCode,
    resStatusMessage,
    resOptions,
    resHeader,
    resContentType,
    resStream,
    resBuffer,
    resText,
    resBody
});
