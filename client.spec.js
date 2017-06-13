"use strict";

const R = require("ramda");
const {expect} = require("chai");
const client = require("./client");

describe("client", () => {
    describe("verb", () => {
        it("should construct a merge command with the relevant parts", () => {
            expect(client.verb("GET")({})).to.deep.equal({method: "GET"});
        });
    });
    describe("resource", () => {
        it("should build the expected structure for a parse", () => {
            expect(client.resource("http://localhost:8080/a/path?a=1")({}))
                .to.deep.equal({
                    protocol: "http:",
                    host: "localhost:8080",
                    path: "/a/path?a=1"
                });
        });
    });
    describe("search", () => {
        it("should build the expected structure for search", () => {
            const composite = R.compose(
                client.search({q: "thefun", d: "is"}),
                client.resource("http://localhost/a/path")
            );
            expect(composite({}))
                .to.deep.equal({
                    protocol: "http:",
                    host: "localhost",
                    path: "/a/path?q=thefun&d=is"
                });
        });
    });
    describe("body", () => {
        it("should build the expected structure", () => {
            expect(client.body("text here")({}))
                .to.deep.equal({
                    body: Buffer.from("text here"),
                    headers: {"Content-Length": Buffer.byteLength(Buffer.from("text here")).toString()}
                });
        });
    });
    describe("dsl", () => {
        it("should render the expected output", () => {
            expect(client.dsl([
                client.get,
                client.resource("http://remote/path/of/something"),
                client.search({a: 1}),
                client.header("Accept", "application/json")
            ]))
            .to.deep.equal({
                method: "GET",
                protocol: "http:",
                host: "remote",
                path: "/path/of/something?a=1",
                headers: {Accept: "application/json"}
            });
        });
    });
});
