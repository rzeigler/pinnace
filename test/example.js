"use strict";
 /* eslint no-console:"off" */
const {streaming, get, conf, uri} = require("../core");
const fs = require("fs");

get(conf(uri("http://www.google.com/")))
    .fork(console.error, console.log);

streaming.get(conf(uri("http://www.google.com/")))
    .fork(console.error, res => {
        res.bodyStream.pipe(fs.createWriteStream("./output.txt"));
    });
