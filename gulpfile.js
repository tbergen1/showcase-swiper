// Dependencies
var gulp = require('gulp'),
    gconcat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    shell = require('gulp-shell'),
    git = require('gulp-git'),
    bump = require('gulp-bump'),
    filter = require('gulp-filter'),
    tag_version = require('gulp-tag-version'),
    server = require('gulp-develop-server');

var serverJSlocations = ['./server.js'];
// Client-Side Javascript – Don't forget to add dependencies in here for minification.  Order of loading is also important.
var clientJSlocations = [
    './public/libs/jquery/dist/jquery.min.js',
    './public/libs/servant-sdk-javascript/src/servant_sdk_javascript.js',
    './public/js/*.js'
];

/**
 * Server ----------------------------------------
 */

gulp.task('server:start', function() {
    server.listen({
        path: './server.js'
    });
    // Watch server-side code.  If changes happen, restart node server
    gulp.watch(serverJSlocations, ['server:restart']);
});

gulp.task('server:restart', [], server.restart);

/**
 * Build ----------------------------------------
 */

gulp.task('build', function() {
    return gulp.src(clientJSlocations)
        .pipe(gconcat('application.js'))
        .pipe(gulp.dest('./public/dist'))
        .pipe(uglify())
        .pipe(rename('application.min.js'))
        .pipe(gulp.dest('./public/dist'));
});

/**
 * Publish --------------------------------------
 */

function publish(importance) {
    // get all the files to bump version in
    gulp.src(['./package.json'])
        // bump the version number in those files
        .pipe(bump({
            type: importance
        }))
        // save it back to filesystem
        .pipe(gulp.dest('./'))
        // commit the changed version number
        .pipe(git.commit('bumps package version'))
        // read only one file to get the version number
        .pipe(filter('package.json'))
        // **tag it in the repository**
        .pipe(tag_version());
}

gulp.task('patch', ['build'], function() {
    return publish('patch');
})
gulp.task('feature', ['build'], function() {
    return publish('minor');
})
gulp.task('release', ['build'], function() {
    return publish('major');
})

/**
 * Default ----------------------------------------
 */

gulp.task('default', ['server:start']);




// End