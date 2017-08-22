"use strict";
const {expect} = require("chai");
const {httpForProto} = require("./core");

describe("core", () => {
    describe("httpForProto", () => {
        it("should return the correct module", () => {
            expect(httpForProto("http:")).to.equal(require("http"));
            expect(httpForProto("https:")).to.equal(require("https"));
        });
    });
});
