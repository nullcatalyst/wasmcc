#!/usr/bin/env node
global.Promise          = require("bluebird");

const argv      = process.argv.slice(2);
const os        = require("os");
const path      = require("path");
const fs        = require("fs");
const wasmcc    = require("./index");
const args      = require("minimist")(argv, {
    string: ["o", "exports", "clang", "wasm-dis", "wasm-opt"],
    boolean: ["O", "s", "z", "debug"],
    alias: {
        o: "output",
        g: "debug",
        x: "exports",
    },
    default: {
        output: "a.out.wasm",
        concurrency: os.cpus().length,
        stack: 1,
    },
});

const readFile  = Promise.promisify(fs.readFile);

(async function () {
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

    let exports = null;
    if (args.exports) {
        const exportsStr = await readFile(path.resolve(args.exports), "utf8");
        exports = JSON.parse(exportsStr);
    }

    const options = {
        output              : args.output,
        stack               : parseInt(args.stack, 10) || 0,
        debug               : !!args.debug,
        optimize            : args.optimize,
        exports             : exports,
        cflags              : process.env.CFLAGS ? process.env.CFLAGS.split(" ") : [],
        clang               : resolve("clang",      "llvm",     "bin/clang"),
        wasmDis             : resolve("wasm-dis",   "binaryen", "bin/wasm-dis"),
        wasmOpt             : resolve("wasm-opt",   "binaryen", "bin/wasm-opt"),
    };

    if (args._.length > 0) {
        wasmcc(args._, options);
    } else {
        console.log("No input files");
    }
})();

function resolve(override, home, subpath) {
    return args[override] || path.resolve(args[home] || home, subpath);
}
