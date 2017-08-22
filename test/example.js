"use strict";
 /* eslint no-console:"off" */
const {get, conf, uri} = require("../core");

get(conf(uri("https://www.google.com/")))
    .fork(console.error, console.log);
    
get(conf(uri("https://www.google.com/something/random")))
    .fork(console.error, console.log);
