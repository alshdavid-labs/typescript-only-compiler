const tsConfig = require('./tsconfig.json')
const gulp = require('gulp');
const ts = require('gulp-typescript');
const merge = require('merge2');
const tsProject = ts.createProject('tsconfig.json');
const resolveTsconfig = require('./gulp/resolve-tsconfig')

const buildTypeScript = () => {
  const results = gulp.src('src/**/*.?(ts|tsx)')
    .pipe(resolveTsconfig(tsConfig))
    .pipe(tsProject())

  return merge([
    results.dts.pipe(gulp.dest('./static/dist')),
    results.js.pipe(gulp.dest('./static/dist'))
  ])
}

exports.build = gulp.series(buildTypeScript)
exports.watch = () => gulp.watch(['src/**/*.*'], gulp.series(buildTypeScript))
