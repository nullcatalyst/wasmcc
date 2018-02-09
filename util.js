global.Promise  = require("bluebird");
const fs        = require("fs");
const path      = require("path");
const { spawn } = require("child_process");

module.exports = {
    readFile    : Promise.promisify(fs.readFile),
    writeFile   : Promise.promisify(fs.writeFile),
    run,
    replaceExt,
};

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
                reject();
            }
        });

        if (pipe) {
            child.stdout.pipe(process.stdout);
            child.stderr.pipe(process.stderr);
            process.stdin.pipe(child.stdin);
        } else {
            child.stdout.on("data", (data) => console.log(name + ":", data.toString()));
            child.stderr.on("data", (data) => console.error(name + ":", data.toString()));
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