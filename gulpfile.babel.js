import gulp from 'gulp';
import path from 'path';
import babel from 'gulp-babel';
import {readFileSync} from 'fs';
import webpack from 'gulp-webpack';
import print from 'gulp-print';
import nodemon from 'gulp-nodemon';
import mocha from 'gulp-mocha';
import {log} from 'gulp-util';
import {spawn} from 'child_process'

const assets_src = ['{views,public}/**/*'];
const dest = 'dist';
const js_src=['**/*.js', '!node_modules/**/*', '!gulp*', `!${dest}/**/*`, '!**/*.test.js'];
const js_test_src = ['**/*.test.js', '!node_modules/**/*',];
const front_build_dir = 'node_modules/szlk.front.elm/build';

gulp.task('build:external', function(){
  return gulp.src(front_build_dir+'/*')
    .pipe(gulp.dest(dest+'/public/').on('error', log));
});

gulp.task('build:assets', function(){
  return gulp.src(assets_src)
    .pipe(gulp.symlink(dest+'/').on('error', log));
});

gulp.task('build:js', function(){
    return gulp.src(js_src)
      .pipe(babel().on('error', log))
      .pipe(gulp.dest(dest+'/'));
});

gulp.task('build:all',  gulp.parallel('build:external', 'build:assets', 'build:js'));

gulp.task('watch:build', function(){
  return gulp.watch(js_src, gulp.series('build:all'));
})

gulp.task('run:db', function(done){
  const child = spawn('mongod', ['--dbpath', './data'], {stdio:"inherit"});
  child.on("exit", done);
})

gulp.task('run:server', gulp.series('build:all', function(){
  return nodemon({
    script: `${dest}/bin/server.js`,
    ext: 'js',
    env: { 'NODE_ENV': 'development', 'PORT' : 3000 }
  })
}));

gulp.task('test:js', function(){
  return gulp.src(js_test_src)
            .pipe(mocha({
              compilers:"js:babel-core/register"
            }).on("error", log));
});

gulp.task('watch:test', gulp.series('test:js', gulp.parallel(
  function(){
    return gulp.watch(js_test_src, gulp.series('test:js'));
  },
  function(){
    return gulp.watch(js_src, gulp.series('test:js'));
  }
)));

gulp.task('default', gulp.parallel('run:server', 'watch:build'));
