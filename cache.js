"use strict";

const L = require("partial.lenses");

/* The structure of the cache is as follows
{
    [host]: {
        [resource]: [{
            req: Config,
            res: Response
        }]
    }
}
*/

const config = L.prop("req");
const response = L.prop("res");

const cachedFor = ({protocol, host, path}) =>
    L.compose(L.prop(`${protocol}//${host}`), L.compose(path));
    
module.exports = {
    
};
