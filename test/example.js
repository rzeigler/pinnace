"use strict";
 /* eslint no-console:"off" */
const {streaming, get, conf, uri} = require("../core");
const fs = require("fs");

get(conf(uri("https://www.google.com/")))
    .fork(console.error, console.log);
    
get(conf(uri("https://www.google.com/something/random")))
    .fork(console.error, console.log);
    

// streaming.get(conf(uri("https://www.google.com/")))
//     .fork(console.error, res => {
//         res.bodyStream.pipe(fs.createWriteStream("./output.txt"));
//     });
//     
// streaming.get(conf(uri("https://www.google.com/")))
//     .fork(console.error, res => {
//         res.bodyStream.pipe(fs.createWriteStream("./output2.txt"));
//     })(); // with cancellation 😁
