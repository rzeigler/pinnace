"use strict";

const sinon = require("sinon");
const {expect} = require("chai");
const {init, modify, get, set, watch, unwatch} = require("./atom");
const {add, multiply} = require("ramda");

describe("atom", () => {
    describe("init", () => {
        it("should initialize an atom", () => {
            expect(init(5)).to.deep.equal({value: 5, subscribers: []});
        });
    });
    describe("behaviors", () => {
        let atom = null;
        beforeEach(() => {
            atom = init(10);
        });
        describe("get", () => {
            it("should return the value", () => {
                expect(get(atom)).to.equal(10);
            });
        });
        describe("set", () => {
            it("should set the value", () => {
                set(atom, 5);
                expect(get(atom)).to.equal(5);
            });
        });
        describe("modify", () => {
            it("should run a modify function on the atom", () => {
                modify(atom, add(10));
                expect(get(atom)).to.equal(20);
            });
        });
        describe("notification behavior", () => {
            let callback;
            beforeEach(() => {
                callback = sinon.spy();
            });
            it("should be triggered by set", () => {
                watch(atom, callback);
                set(atom, 6);
                set(atom, 7);
                expect(callback.calledWith(6)).to.equal(true);
                expect(callback.calledWith(7)).to.equal(true);
            });
            it("should be triggered by modify", () => {
                watch(atom, callback);
                modify(atom, add(1));
                modify(atom, multiply(2));
                expect(callback.calledWith(11)).to.equal(true);
                expect(callback.calledWith(22)).to.equal(true);
            });
            it("should respond to unwatch", () => {
                watch(atom, callback);
                set(atom, 6);
                unwatch(atom, callback);
                set(atom, 7);
                expect(callback.calledWith(6)).to.equal(true);
                expect(callback.calledWith(7)).to.equal(false);
            });
        });
    });
});
