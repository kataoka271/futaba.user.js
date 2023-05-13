const { dest, watch } = require("gulp");
const ts = require("gulp-typescript");
const fileinclude = require("gulp-file-include");
const lec = require("gulp-line-ending-corrector");

const tsProject = ts.createProject("tsconfig.json");

function build() {
  return tsProject
    .src()
    .pipe(fileinclude())
    .pipe(tsProject())
    .js.pipe(lec({ eolc: "CRLF" }))
    .pipe(dest("dist"));
}

exports.default = build;

exports.watch = function () {
  watch(["src/**/*.ts", "src/**/*.css"], build);
};
