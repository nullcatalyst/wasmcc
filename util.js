const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { promisify } = require("util");

module.exports = {
    readFile    : promisify(fs.readFile),
    writeFile   : promisify(fs.writeFile),
    run,
    replaceExt,
};

let prevRunProgram = null;
async function run(program, args, pipe) {
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
                reject(`Program ${name} exited with: ${signal}`);
            }
        });

        if (pipe) {
            child.stdout.pipe(process.stdout);
            child.stderr.pipe(process.stderr);
            process.stdin.pipe(child.stdin);
        } else {
            child.stdout.on("data", (data) => {
                if (prevRunProgram !== name) {
                    prevRunProgram = name;
                    console.log("#", name);
                }
                console.log(data.toString());
            });
            child.stderr.on("data", (data) => {
                if (prevRunProgram !== name) {
                    prevRunProgram = name;
                    console.error("#", name);
                }
                console.error(data.toString());
            });
        }
    });
}

function replaceExt(file, ext) {
    const currExt = path.extname(file);
    if (currExt) {
        file = file.slice(0, file.lastIndexOf(currExt))
    }

    return file + ext;
}
