#!/usr/bin/env node

const os        = require("os");
const path      = require("path");
const args      = require("minimist")(process.argv.slice(2));
const wasmcc    = require("./index");

const options = {
    output              : args.o            || args.output  || "a.out.wasm",
    stack               : +args.stack       || 1,
    concurrency         : +args.concurrency || os.cpus().length,
    debug               : !!args.debug,
    cflags              : process.env.CFLAGS ? process.env.CFLAGS.split(" ") : ["-Oz"],
    clang               : resolve("clang",      "llvm",     "bin/clang"),
    llvmLink            : resolve("llvm-link",  "llvm",     "bin/llvm-link"),
    llc                 : resolve("llc",        "llvm",     "bin/llc"),
    s2wasm              : resolve("s2wasm",     "binaryen", "bin/s2wasm"),
    wat2wasm            : resolve("wat2wasm",   "wabt",     "bin/wat2wasm"),
    wasmOpt             : resolve("wasm-opt",   "binaryen", "bin/wasm-opt"),
    wasmDis             : resolve("wasm-dis",   "binaryen", "bin/wasm-dis"),
};

wasmcc(args._, options);

function resolve(override, home, subpath) {
    console.log(path.resolve(args[home] || home, subpath));
    return args[override] || path.resolve(args[home] || home, subpath);
}
