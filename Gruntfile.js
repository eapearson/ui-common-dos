'use strict';
var path = require('path');

module.exports = function(grunt) {
    // Project configuration
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-filerev');
    grunt.loadNpmTasks('grunt-regex-replace');
    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-coveralls');

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        'copy': {
            'build-config': {
                src: 'source/config/prod.yml',
                dest: 'build/config.yml',
            },
        },

        // Compile the requirejs stuff into a single, uglified file.
        // the options below are taken verbatim from a standard build.js file
        // used for r.js (if we were doing this outside of a grunt build)
        'requirejs': {
            compile: {
                options: {
                    baseUrl: ".",
                    mainConfigFile: "functional-site/js/require-config.js",
                    findNestedDependencies: true,
                    optimize: "uglify2",
                    generateSourceMaps: true,
                    preserveLicenseComments: false,
                    name: "functional-site/js/require-config",
                    out: "functional-site/js/dist/kbase-min.js"
                }
            }
        },

        // Put a 'revision' stamp on the output file. This attaches an 8-character 
        // md5 hash to the end of the requirejs built file.
        'filerev': {
            options: {
                algorithm: 'md5',
                length: 8
            },
            source: {
                files: [{
                    src: [
                        'functional-site/js/dist/kbase-min.js',
                    ],
                    dest: 'functional-site/js/dist/'
                }]
            }
        },

        // Once we have a revved file, this inserts that reference into page.html at
        // the right spot (near the top, the narrative_paths reference)
        'regex-replace': {
            dist: {
                src: ['functional-site/index.html'],
                actions: [
                    {
                        name: 'requirejs-onefile',
                        search: 'js/require-config.js',
                        replace: function(match) {
                            // do a little sneakiness here. we just did the filerev thing, so get that mapping
                            // and return that (minus the .js on the end)
                            var revvedFile = grunt.filerev.summary['functional-site/js/dist/kbase-min.js'];
                            // starts with 'functional-site/' so return all but the first 16 characters
                            return revvedFile.substr(16);
                        },
                        flags: ''
                    }
                ]
            }
        },

        // Testing with Karma!
        'karma': {
            unit: {
                configFile: 'test/karma.conf.js'
            },
            dev: {
                reporters: 'dots'
            }
        },

        // Run coveralls and send the info.
        'coveralls': {
            options: {
                force: true,
            },
            'ui-common': {
                src: 'coverage/**/*.info',
            },
        },

    });


    grunt.registerTask('build', [
        'requirejs',
        'filerev',
        'regex-replace'
    ]);

    grunt.registerTask('build-config', [
        'copy'
    ]);

    grunt.registerTask('test', [
        'karma:unit',
        'coveralls'
    ]);
};