const path = require("path");

const { readFile, writeFile, run, replaceExt } = require("./util");

module.exports = async function (cFiles, options) {
    try {
        if (path.extname(options.output) !== ".wasm") options.output += ".wasm";

        const wasm1File = await compile2wasm(cFiles, options);
        const wat1File  = await wasm2wat(wasm1File, options);
        let watStr      = await readFile(wat1File, "utf8");

        // Update the memory size, adding in the size of the stack
        if (options.stack > 0) {
            // Increase the memory size to incorporate the stack
            watStr = watStr.replace(/\(memory \$0 ([0-9]+)\)/, (match, size) => {
                const pageCount = (+size + options.stack) | 0;
                return `(memory $0 ${pageCount})`;
            });

            // Replace the `__stack_pointer` import with an assigned value
            watStr = watStr.replace(/\(import "env" "__stack_pointer" \((.*?)\)\)/, (match, stackPtr) => {
                const pageCount = (+size + options.stack) | 0;
                const pageSize = 64 * 1024; // 64kb
                const stackInt = (pageCount * pageSize - 1) | 0;

                return `(${stackPtr} (i32.const ${stackInt}))`
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

        await writeFile(wat1File, watStr);

        const wasm2File = await wat2wasmOpt(wat1File, options, replaceExt(options.output, ".opt.wasm"));
        const wat2File  = await wasm2wat(wasm2File, options, replaceExt(options.output, ".opt.wat"));
    } catch (error) {
        console.error(error);
    }
}

async function compile2wasm(files, options, output) {
    output = output || options.output;
    const args = ["--target=wasm32-unknown-unknown-wasm", "-nostdlib", "-D__wasm__", options.optimize, ...options.cflags, ...options.cxxflags, "-r", "-o", output, ...files];
    await run(options.clang, args);
    return output;
}

async function wasm2wat(file, options, output) {
    output = output || replaceExt(options.output, ".wat");
    const args = ["-o", output, file];
    await run(options.wasmDis, args);
    return output;
}

async function wat2wasmOpt(file, options, output) {
    output = output || replaceExt(options.output, ".wasm");
    const args = [options.optimize, ...(options.debug ? ["-g"] : ["--reorder-functions", "--reorder-locals", "--vacuum"]), "-o", output, file];
    await run(options.wasmOpt, args);
    return output;
}
