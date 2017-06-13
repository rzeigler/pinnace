"use strict";

const Promise = require("bluebird");
const R = require("ramda");
const L = require("partial.lenses");
const {optBody, contentTypeJson} = require("./client");

const thrush = R.curry((f, a) => f(a));

const compile = R.curry((stack, client) => R.pipe(
    R.map(R.compose(Promise.resolve)),
    R.reduceRight(thrush, client)
)(stack));

const before = R.curry((pre, client, config) => pre(config).then(client));

const after = R.curry((post, client, config) => client(config).then(post));

const recover = R.curry((post, client, config) => client(config).catch(post));

const bracket = R.curry((pre, post, client, config) => pre(config).then(client).then(post));

const jsonEncode = before(R.compose(
    L.over(optBody, R.compose(Buffer.from, JSON.stringify)),
    contentTypeJson
));

module.exports = {
    compile,
    before,
    after,
    recover,
    bracket,
    jsonEncode
};
