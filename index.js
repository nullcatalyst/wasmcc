global.Promise  = require("bluebird");

const path      = require("path");
const fs        = require("fs");
const { spawn } = require("child_process");
const tmp       = require("tmp");

const readFile  = Promise.promisify(fs.readFile);
const writeFile = Promise.promisify(fs.writeFile);
const tmpDir    = Promise.promisify(tmp.dir);
const tmpFile   = Promise.promisify(tmp.file);

module.exports = async function (cFiles, options) {
    try {
        if (path.extname(options.output) !== ".wasm") options.output += ".wasm";

        const tmp       = await tmpDir();

        const wasm1File = await compile2wasm(cFiles, options);

        const watFile   = await wasm2wat(wasm1File, options);
        let watStr      = await readFile(watFile, "utf8");

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
        // const owatFile  = await wasm2wat(wasmFile, options);
    } catch (error) {
        console.error(error);
    }
}

function replaceExt(file, ext) {
    const currExt = path.extname(file);
    if (currExt) {
        file = file.slice(0, file.lastIndexOf(currExt))
    }

    return file + ext;
}

async function run(program, args) {
    return new Promise((resolve, reject) => {
        const name = path.basename(program);
        const child = spawn(program, args);

        child.on("error", (error) => {
            reject(error);
        });

        child.on("exit", (code, signal) => {
            if (code === 0) {
                resolve();
            } else {
                reject();
            }
        });

        child.stdout.on("data", (data) => {
            console.log(name + ":", data.toString());
        });

        child.stderr.on("data", (data) => {
            console.error(name + ":", data.toString());
        });
    });
}

async function compile2wasm(files, options) {
    const output = options.output;//await tmpFile();
    const args = ["--target=wasm32-unknown-unknown-wasm", "-nostdlib", "-D__wasm__", options.optimize, ...options.cflags, "-r", "-o", output, ...files];
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
    const output = replaceExt(options.output, ".opt.wasm");//options.output
    const args = [options.optimize, ...(options.debug ? ["-g"] : ["--vacuum", "--reorder-functions", "--reorder-locals"]), "-o", output, file];
    await run(options.wasmOpt, args);
    return output;
}
