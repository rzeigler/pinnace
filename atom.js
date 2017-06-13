"use strict";

const R = require("ramda");

function Atom(initial) {
    this.value = initial;
    this.subscribers = [];
}

const init = R.construct(Atom);

const notify = (atom) => {
    R.forEach((s) => s(atom.value), atom.subscribers);
};

const get = (atom) => atom.value;

const set = R.curry((atom, val) => {
    atom.value = val;
    notify(atom);
});

const modify = R.curry((atom, fn) => {
    atom.value = fn(atom.value);
    notify(atom);
});

const watch = R.curry((atom, fn) => {
    atom.subscribers = R.append(fn, atom.subscribers);
});

const unwatch = R.curry((atom, fn) => {
    atom.subscribers = R.filter(R.complement(R.equals(fn)), atom.subscribers);
});

module.exports = {
    Atom,
    init,
    get,
    set,
    modify,
    watch,
    unwatch
};
