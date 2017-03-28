"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var mkdirp_1 = require("mkdirp");
var rimraf_1 = require("rimraf");
var child_process_1 = require("child_process");
var extend = require("xtend");
var ts = require("typescript");
var astring = require("astring");
var extractFromTSX_1 = require("./extractFromTSX");
var artifacts_1 = require("./artifacts");
var watching = false;
var defaultOptions = {
    builds: {},
    debug: false,
    watch: false,
    test: /\.tsx?$/,
    output: 'extjs',
    sdk: '',
    toolkit: 'modern',
    theme: 'theme-triton',
    packages: []
};
var ReactExtJSWebpackTSPlugin = (function () {
    function ReactExtJSWebpackTSPlugin(options) {
        if (options === void 0) { options = {}; }
        this.dependencies = {};
        this.options = extend(options, defaultOptions, options);
        if (Object.keys(this.options.builds).length === 0) {
            var _a = this.options, sdk = _a.sdk, toolkit = _a.toolkit, theme = _a.theme, packages = _a.packages, output = _a.output;
            this.options.builds.ext = { sdk: sdk, toolkit: toolkit, theme: theme, packages: packages, output: output };
        }
        for (var name_1 in this.options.builds) {
            this._validateBuildConfig(name_1, this.options.builds[name_1]);
        }
    }
    ReactExtJSWebpackTSPlugin.prototype.apply = function (compiler) {
        var _this = this;
        compiler.plugin('watch-run', function (watching, cb) {
            _this.options.watch = true;
            cb();
        });
        var me = this;
        var addToManifest = function (call) {
            var file;
            try {
                file = this.state.module.resource;
                var deps = me.dependencies[file];
                if (!deps) {
                    deps = me.dependencies[file] = [];
                }
                deps.push(astring(call));
            }
            catch (e) {
                console.error("Error processing " + file + ", " + e);
            }
        };
        compiler.plugin('compilation', function (compilation, params) {
            compilation.plugin('build-module', function (module) {
                _this.currentFile = module.resource;
                if (module.resource && module.resource.match(_this.options.test)) {
                    try {
                        if (_this.options.debug) {
                            console.log(module.resource);
                        }
                        var contents = fs.readFileSync(module.resource, 'utf8');
                        var statements = extractFromTSX_1.default(contents, ts.ScriptTarget.ES2016);
                        _this.dependencies[_this.currentFile] = statements;
                    }
                    catch (e) {
                        console.error('error parsing ' + _this.currentFile);
                    }
                }
            });
            params.normalModuleFactory.plugin('parser', function (parser, options) {
                parser.plugin('call Ext.create', addToManifest);
                parser.plugin('call Ext.require', addToManifest);
                parser.plugin('call Ext.define', addToManifest);
            });
        });
        compiler.plugin('emit', function (compilation, callback) {
            var modules = compilation.chunks.reduce(function (a, b) { return a.concat(b.modules); }, []);
            var build = _this.options.builds[Object.keys(_this.options.builds)[0]];
            var outputPath = path.join(compiler.outputPath, _this.options.output);
            if (compiler.outputPath === '/' && compiler.options.devServer) {
                outputPath = path.join(compiler.options.devServer.contentBase, outputPath);
            }
            console.log("outputPath: " + outputPath);
            _this._buildExtBundle('ext', modules, outputPath, build)
                .then(function () {
                var jsChunk = compilation.addChunk(_this.options.output + "-js");
                jsChunk.isInitial = function () { return true; };
                jsChunk.ids = [0];
                jsChunk.files.push(path.join(_this.options.output, 'ext.js'));
                jsChunk.files.push(path.join(_this.options.output, 'ext.css'));
                jsChunk.hasRuntime = function () { return true; };
                jsChunk.id = -1;
                callback();
            })
                .catch(function (e) { return callback(e || new Error('Error building Ext JS bundle')); });
        });
    };
    ReactExtJSWebpackTSPlugin.prototype._validateBuildConfig = function (name, build) {
        var sdk = build.sdk;
        if (!sdk) {
            throw new Error("Missing required option sdk in build " + name + ".  This must be the path to your Ext JS SDK.");
        }
    };
    ReactExtJSWebpackTSPlugin.prototype._buildExtBundle = function (name, modules, output, _a) {
        var _this = this;
        var _b = _a.toolkit, toolkit = _b === void 0 ? 'modern' : _b, theme = _a.theme, _c = _a.packages, packages = _c === void 0 ? [] : _c, sdk = _a.sdk;
        return new Promise(function (resolve, reject) {
            console.log("\nbuilding Ext JS bundle: " + name + " => " + output);
            if (!watching) {
                rimraf_1.sync(output);
                mkdirp_1.sync(output);
            }
            var statements = ['Ext.require("Ext.Component")'];
            for (var _i = 0, modules_1 = modules; _i < modules_1.length; _i++) {
                var module_1 = modules_1[_i];
                var deps = _this.dependencies[module_1.resource];
                if (deps) {
                    statements = statements.concat(deps);
                }
            }
            var js = statements.join(';\n');
            var manifest = path.join(output, 'manifest.js');
            fs.writeFileSync(manifest, js, 'utf8');
            if (!watching) {
                fs.writeFileSync(path.join(output, 'build.xml'), artifacts_1.buildXML, 'utf8');
                fs.writeFileSync(path.join(output, 'app.json'), artifacts_1.createAppJson({ theme: theme, packages: packages, toolkit: toolkit }), 'utf8');
                fs.writeFileSync(path.join(output, 'workspace.json'), artifacts_1.createWorkspaceJson(sdk, output), 'utf8');
            }
            if (_this.options.watch) {
                if (!watching) {
                    var watching_1 = child_process_1.spawn('sencha', ['ant', 'watch'], { cwd: output });
                    watching_1.stdout.pipe(process.stdout);
                    watching_1.stdout.on('data', function (data) {
                        if (data.toString().match(/Waiting for changes\.\.\./)) {
                            resolve(output);
                        }
                    });
                    watching_1.on('exit', function (code) { return reject(); });
                }
            }
            else {
                child_process_1.execSync('sencha ant build', { cwd: output, stdio: 'inherit' });
                resolve(output);
            }
        });
    };
    return ReactExtJSWebpackTSPlugin;
}());
exports.default = ReactExtJSWebpackTSPlugin;
;
//# sourceMappingURL=index.js.map