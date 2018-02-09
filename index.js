global.Promise  = require("bluebird");
const path      = require("path");

const { readFile, writeFile, run, replaceExt } = require("./util");

module.exports = async function (cFiles, options) {
    try {
        if (path.extname(options.output) !== ".wasm") options.output += ".wasm";

        const wasm1File = await compile2wasm(cFiles, options);
        const watFile   = await wasm2wat(wasm1File, options);
        let watStr      = await readFile(watFile, "utf8");

        // Update the memory size, adding in the size of the stack
        if (options.stack > 0) {
            watStr = watStr.replace(/\(memory \$0 ([0-9]+)\)/, (match, size) => {
                const pageCount = (+size + options.stack) | 0;
                const pageSize = 64 * 1024; // 64kb
                const stackInt = (pageCount * pageSize - 1) | 0;
                const stackStr = ("00000000" + stackInt.toString(16)).slice(-8);

                const a = stackStr.slice(6, 8);
                const b = stackStr.slice(4, 6);
                const c = stackStr.slice(2, 4);
                const d = stackStr.slice(0, 2);

                return `(memory $0 ${pageCount})\n (data (i32.const 4) "\\${a}\\${b}\\${c}\\${d}")`;
            });
        }

        // Comment out any unnecessary exports
        if (options.exports) {
            watStr = watStr.replace(/\(export "(.+?)" \(.*?\)\)/g, (match, exportName) => {
                if (options.exports.indexOf(exportName) >= 0) {
                    return match;
                } else {
                    return `(; ${match} ;)`;
                }
            });
        }

        await writeFile(watFile, watStr);

        const wasmFile  = await wat2wasmOpt(watFile, options);
    } catch (error) {
        console.error(error);
    }
}

async function compile2wasm(files, options) {
    const output = options.output;
    const args = ["--target=wasm32-unknown-unknown-wasm", "-nostdlib", "-D__wasm__", options.optimize, ...options.cflags, ...options.cxxflags, "-r", "-o", output, ...files];
    await run(options.clang, args);
    return output;
}

async function wasm2wat(file, options) {
    const output = replaceExt(options.output, ".wat");
    const args = ["-o", output, file];
    await run(options.wasmDis, args);
    return output;
}

async function wat2wasmOpt(file, options) {
    const output = options.output;
    const args = [options.optimize, ...(options.debug ? ["-g"] : ["--reorder-functions", "--reorder-locals", "--vacuum"]), "-o", output, file];
    await run(options.wasmOpt, args);
    return output;
}
