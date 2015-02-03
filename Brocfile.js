var concat     = require('broccoli-sourcemap-concat');
var Funnel     = require('broccoli-funnel');
var mergeTrees = require('broccoli-merge-trees');
var compileES6 = require('broccoli-es6modules');
var jshintTree = require('broccoli-jshint');
var replace    = require('broccoli-string-replace');
var gitVersion = require('git-repo-version');

// --- Compile ES6 modules ---

var loader = new Funnel('bower_components', {
  srcDir: 'loader',
  files: ['loader.js'],
  destDir: '/assets/'
});

// TODO - this manual dependency management has got to go!
var klassy = new Funnel('bower_components', {
  srcDir: '/klassy/lib',
  files: ['klassy.js'],
  destDir: '/'
});
var emberTestHelpers = new Funnel('bower_components', {
  srcDir: '/ember-test-helpers/lib',
  include: [/.js$/],
  destDir: '/'
});
var deps = mergeTrees([klassy, emberTestHelpers]);

var lib = new Funnel('lib', {
  srcDir: '/',
  include: [/.js$/],
  destDir: '/'
});

var tests = new Funnel('tests', {
  srcDir: '/',
  include: [/test-support\/.+.js$/, /.js$/],
  destDir: '/tests'
});

var main = mergeTrees([deps, lib]);
var es6Main = new compileES6(main, {
  esperantoOptions: {
    _evilES3SafeReExports: true
  }
});

main = concat(es6Main, {
  inputFiles: ['**/*.js'],
  outputFile: '/ember-qunit.amd.js'
});

var generatedBowerConfig = new Funnel('build-support', {
  srcDir: '/',
  destDir: '/',
  files: ['bower.json']
});
generatedBowerConfig = replace(generatedBowerConfig, {
  files: ['bower.json'],
  pattern: {
    match: /VERSION_PLACEHOLDER/,
    replacement: function() {
      // remove leading `v` (since by default our tags use a `v` prefix)
      return gitVersion().replace(/^v/, '');
    }
  }
});

var globalizedBuildSupport = new Funnel('build-support', {
  srcDir: '/',
  files: ['iife-start.js', 'globalize.js', 'iife-stop.js'],
  destDir: '/'
});

var globalizedMain = concat(mergeTrees([loader, main, globalizedBuildSupport]), {
  inputFiles: ['iife-start.js', 'assets/loader.js', 'ember-qunit.amd.js', 'globalize.js', 'iife-stop.js'],
  outputFile: '/ember-qunit.js'
});

var jshintLib = jshintTree(lib);
var jshintTest = jshintTree(tests);

var mainWithTests = mergeTrees([deps, lib, tests, jshintLib, jshintTest]);
var es6MainWithTests = new compileES6(mainWithTests, {
  esperantoOptions: {
    _evilES3SafeReExports: true
  }
});

mainWithTests = concat(es6MainWithTests, {
  inputFiles: ['**/*.js'],
  outputFile: '/assets/ember-qunit-tests.amd.js'
});

// --- Select and concat vendor / support files ---

var vendor = concat('bower_components', {
  inputFiles: [
    'jquery/dist/jquery.js',
    'handlebars/handlebars.js',
    'ember/ember.js',
    'ember-data/ember-data.js'
  ],
  outputFile: '/assets/vendor.js'
});

var qunit = new Funnel('bower_components', {
  srcDir: '/qunit/qunit',
  files: ['qunit.js', 'qunit.css'],
  destDir: '/assets'
});

var testIndex = new Funnel('tests', {
  srcDir: '/',
  files: ['index.html'],
  destDir: '/tests'
});

var testSupport = concat('bower_components', {
  inputFiles: ['ember-cli-shims/app-shims.js',
    'ember-cli-test-loader/test-loader.js'],
  outputFile: '/assets/test-support.js'
});

module.exports = mergeTrees([loader, main, mainWithTests, globalizedMain, vendor, testIndex, qunit, testSupport, generatedBowerConfig]);
