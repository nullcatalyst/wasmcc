global.Promise  = require("bluebird");
const path      = require("path");

const { readFile, writeFile, tmpDir, tmpFile, run, replaceExt } = require("./util");

module.exports = async function (cFiles, options) {
    try {
        if (path.extname(options.output) !== ".wasm") options.output += ".wasm";

        const tmp       = await tmpDir();
        const bcFiles   = await Promise.map(cFiles, (file) => compile2bc(tmp, file, options), { concurrency: require("os").cpus().length });
        const bcFile    = await linkbc(bcFiles, options);
        const sFile     = await bc2s(bcFile, options);

        const sStr      = await readFile(sFile, "utf8");
        const useStack  = sStr.indexOf("__stack_pointer") >= 0;

        const watFile   = await s2wat(sFile, options);
        let watStr      = await readFile(watFile, "utf8");

        if (useStack) {
            // console.log("Setting stack pointer");

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
        const owatFile  = await wasm2wat(wasmFile, options);
    } catch (error) {
        console.error(error);
    }
}

async function compile2bc(tmp, file, options) {
    const output = await tmpFile();
    const args = ["-emit-llvm", "--target=wasm32", "-D__wasm__", options.optimize, ...options.cflags, "-o", output, "-c", file];
    await run(options.clang, args);
    return output;
}

async function linkbc(files, options) {
    const output = await tmpFile();
    const args = ["-o", output, ...files];
    await run(options.llvmLink, args);
    return output;
}

async function bc2s(file, options) {
    const output = await tmpFile();
    const args = ["-asm-verbose=false", "-o", output, file];
    await run(options.llc, args);
    return output;
}

async function s2wat(file, options) {
    const output = replaceExt(options.output, ".wat");
    const args = ["-o", output, file];
    await run(options.s2wasm, args);
    return output;
}

async function wat2wasm(file, options) {
    const output = options.output;
    const args = ["-o", output, file];
    await run(options.wat2wasm, args);
    return output;
}

async function wat2wasmOpt(file, options) {
    const output = options.output;
    const args = [options.optimize, ...(options.debug ? ["-g"] : ["--reorder-functions", "--reorder-locals", "--vacuum"]), "-o", output, file];
    await run(options.wasmOpt, args);
    return output;
}

async function wasm2wat(file, options) {
    const output = replaceExt(options.output, ".opt.wat");
    const args = ["-o", output, file];
    await run(options.wasmDis, args);
    return output;
}
