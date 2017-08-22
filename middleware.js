"use strict";
const {curry, fromPairs, map, merge, pipe} = require("ramda");
const {composeK, verbs, requestMethodFactory} = require("./core");

const before = curry((middleware, requestor) => composeK(requestor, middleware));
const after = curry((middleware, requestor) => composeK(middleware, requestor));
const recover = curry((middleware, requestor) => (options) => requestor(options).chainRej(middleware));

const using = curry((middleware, {request}) => {
    const decorated = middleware(request);
    const methods = pipe(
        map(requestMethodFactory(decorated)),
        fromPairs
    )(verbs);
    return merge({
        request: decorated
    }, methods);
});

module.exports = {
    using,
    before,
    after,
    recover
};
