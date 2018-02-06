global.Promise          = require("bluebird");

const path              = require("path");
const fs                = require("fs");
const { spawn }         = require("child_process");

const tmp               = require("tmp");

const readFile          = Promise.promisify(fs.readFile);
const writeFile         = Promise.promisify(fs.writeFile);
const tmpDir            = Promise.promisify(tmp.dir);
const tmpFile           = Promise.promisify(tmp.file);

module.exports = async function (cFiles, options) {
    try {
        const tmp       = await tmpDir();
    
        const bcFiles   = await Promise.map(cFiles, (file) => compile2bc(tmp, file, options), { concurrency: options.concurrency });
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

        await writeFile(watFile, watStr);

        const wasmFile  = await wat2wasmOpt(watFile, options);
        const owatFile  = await wasm2wat(wasmFile, options);
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
            console.log(data.toString());
        });

        child.stderr.on("data", (data) => {
            console.error(data.toString());
        });
    });
}

async function compile2bc(tmp, file, options) {
    const output = await tmpFile();
    const args = ["-emit-llvm", "--target=wasm32", "-D__wasm__", ...options.cflags, "-o", output, "-c", file];
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
    const args = ["--no-export-hidden", "-o", output, file];
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
    const args = ["-Oz", "-o", output, file];
    await run(options.wasmOpt, args);
    return output;
}

async function wasm2wat(file, options) {
    const output = replaceExt(options.output, ".opt.wat");
    const args = ["-o", output, file];
    await run(options.wasmDis, args);
    return output;
}
