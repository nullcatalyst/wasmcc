#!/usr/bin/env node
const argv      = process.argv.slice(2);
const os        = require("os");
const path      = require("path");
const wasmcc    = require("./index");
const args      = require("minimist")(argv, {
    string: ["o", "concurrency"],
    boolean: ["O", "s", "z", "debug"],
    alias: {
        o: "output",
        g: "debug",
        j: "concurrency",
    },
    default: {
        output: "a.out.wasm",
        concurrency: os.cpus().length,
        stack: 1,
    },
});

args.optimize = "-O0";
for (let arg of argv) {
    switch (arg) {
        case "-O0": args.optimize = "-O0"; break;
        case "-O1": args.optimize = "-O1"; break;
        case "-O2": args.optimize = "-O2"; break;
        case "-O3": args.optimize = "-O3"; break;
        case "-Os": args.optimize = "-Os"; break;
        case "-Oz": args.optimize = "-Oz"; break;
    }
}

const cflags = process.env.CFLAGS ? process.env.CFLAGS.split(" ") : [];
if (args.optimize) cflags.unshift(args.optimize);

const options = {
    output              : args.output,
    stack               : parseInt(args.stack, 10) || 1,
    concurrency         : parseInt(args.concurrency, 10) || 1,
    debug               : !!args.debug,
    optimize            : args.optimize,
    cflags              : cflags,
    clang               : resolve("clang",      "llvm",     "bin/clang"),
    llvmLink            : resolve("llvm-link",  "llvm",     "bin/llvm-link"),
    llc                 : resolve("llc",        "llvm",     "bin/llc"),
    s2wasm              : resolve("s2wasm",     "binaryen", "bin/s2wasm"),
    wasmOpt             : resolve("wasm-opt",   "binaryen", "bin/wasm-opt"),
    wasmDis             : resolve("wasm-dis",   "binaryen", "bin/wasm-dis"),
};

if (args._.length > 0) {
    wasmcc(args._, options);
} else {
    console.log("No input files");
}

function resolve(override, home, subpath) {
    return args[override] || path.resolve(args[home] || home, subpath);
}
