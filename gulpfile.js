const { dest, watch, src, series } = require("gulp");
const ts = require("gulp-typescript");
const fileinclude = require("gulp-file-include");
const lec = require("gulp-line-ending-corrector");
const sass = require("gulp-sass")(require("node-sass"));

const tsProject = ts.createProject("tsconfig.json");

function build_ts() {
  return src("src/Futaba.user.ts")
    .pipe(fileinclude())
    .pipe(tsProject())
    .js.pipe(lec({ eolc: "CRLF" }))
    .pipe(dest("dist"));
}

function build_sass() {
  return src("src/**/*.scss")
    .pipe(sass({ outputStyle: "expanded" }))
    .pipe(dest("build/css"));
}

exports.default = series(build_sass, build_ts);

exports.watch = function () {
  watch(["src/**/*.ts", "src/**/*.css", "src/**/*.scss"], exports.default);
};
