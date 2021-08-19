const { src, dest, watch, series } = require("gulp");
const ts = require("gulp-typescript");
const fileinclude = require("gulp-file-include");
const lec = require("gulp-line-ending-corrector");

const tsProject = ts.createProject("tsconfig.json");

function defaultTask() {
  return tsProject.src()
    .pipe(fileinclude())
    .pipe(tsProject())
    .js
    .pipe(lec({ eolc: "CRLF" }))
    .pipe(dest("dist"));
}

function watchTask() {
  watch("src/**/*.ts", series("default"));
}

exports.default = defaultTask;
exports.watch = watchTask;