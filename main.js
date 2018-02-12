#!/usr/bin/env node
const argv = process.argv.slice(2);
const path = require("path");
const args = require("minimist")(argv, {
    string: ["o", "exports", "clang", "wasm-dis", "wasm-opt", "llvm", "binaryen"],
    boolean: ["O", "s", "z", "debug", "install"],
    alias: {
        o: "output",
        g: "debug",
        x: "exports",
    },
    default: {
        output: "a.out.wasm",
        stack: 0,
    },
});

const { readFile, run } = require("./util");
const wasmcc = require("./index");

(async function () {
    if (args.install) {
        process.chdir(__dirname);
        return run("bash", ["install.sh"], true);
    }

    // Early exit (no input files)
    if (args._.length === 0) {
        console.log("No input files");
        return;
    }

    // Find the optimize flag (not supported by minimist)
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

    // Load the list of exported functions
    let exportList = null;
    if (args.exports) {
        const exportsStr = await readFile(path.resolve(args.exports), "utf8");
        exportList = JSON.parse(exportsStr);
    }

    const options = {
        output              : args.output,
        stack               : parseInt(args.stack, 10) || 0,
        debug               : !!args.debug,
        optimize            : args.optimize,
        exports             : exportList,
        cflags              : process.env.CFLAGS ? process.env.CFLAGS.split(" ") : [],
        cxxflags            : process.env.CXXFLAGS ? process.env.CXXFLAGS.split(" ") : [],
        clang               : resolve("clang",      "llvm",     "bin/clang") + (process.argv[1] === "wasmcpp" ? "++" : ""),
        wasmDis             : resolve("wasm-dis",   "binaryen", "bin/wasm-dis"),
        wasmOpt             : resolve("wasm-opt",   "binaryen", "bin/wasm-opt"),
    };

    return wasmcc(args._, options);
})();

function resolve(override, home, subpath) {
    return (
        args[override] ||
        (args[home] ? path.resolve(args[home], subpath) : path.resolve(__dirname, home, subpath))
    );
}
