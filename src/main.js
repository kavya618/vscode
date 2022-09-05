/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

const perf = require('./vs/base/common/performance');
perf.mark('code/didStartMain');

const __getOwnPropNames = Object.getOwnPropertyNames;
const __commonJS = (cb, mod) => function __require() {
	return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// bootstrap.js
const require_bootstrap = __commonJS({
	'bootstrap.js'(exports, module2) {
		'use strict';
		(function (globalThis, factory) {
			if (typeof exports === 'object') {
				module2.exports = factory();
			} else {
				globalThis.MonacoBootstrap = factory();
			}
		})(exports, function () {
			const Module = typeof require === 'function' ? require('module') : void 0;
			const path2 = typeof require === 'function' ? require('path') : void 0;
			const fs2 = typeof require === 'function' ? require('fs') : void 0;
			Error.stackTraceLimit = 100;
			if (typeof process !== 'undefined' && !process.env['VSCODE_HANDLES_SIGPIPE']) {
				process.on('SIGPIPE', () => {
					console.error(new Error('Unexpected SIGPIPE'));
				});
			}
			function enableASARSupport(appRoot) {
				if (!path2 || !Module || typeof process === 'undefined') {
					console.warn('enableASARSupport() is only available in node.js environments');
					return;
				}
				const NODE_MODULES_PATH = appRoot ? path2.join(appRoot, 'node_modules') : path2.join(__dirname, '../node_modules');
				let NODE_MODULES_ALTERNATIVE_PATH;
				if (appRoot && process.platform === 'win32') {
					const driveLetter = appRoot.substr(0, 1);
					let alternativeDriveLetter;
					if (driveLetter.toLowerCase() !== driveLetter) {
						alternativeDriveLetter = driveLetter.toLowerCase();
					} else {
						alternativeDriveLetter = driveLetter.toUpperCase();
					}
					NODE_MODULES_ALTERNATIVE_PATH = alternativeDriveLetter + NODE_MODULES_PATH.substr(1);
				} else {
					NODE_MODULES_ALTERNATIVE_PATH = void 0;
				}
				const NODE_MODULES_ASAR_PATH = `${NODE_MODULES_PATH}.asar`;
				const NODE_MODULES_ASAR_ALTERNATIVE_PATH = NODE_MODULES_ALTERNATIVE_PATH ? `${NODE_MODULES_ALTERNATIVE_PATH}.asar` : void 0;
				const originalResolveLookupPaths = Module._resolveLookupPaths;
				Module._resolveLookupPaths = function (request, parent) {
					const paths = originalResolveLookupPaths(request, parent);
					if (Array.isArray(paths)) {
						let asarPathAdded = false;
						for (let i = 0, len = paths.length; i < len; i++) {
							if (paths[i] === NODE_MODULES_PATH) {
								asarPathAdded = true;
								paths.splice(i, 0, NODE_MODULES_ASAR_PATH);
								break;
							} else if (paths[i] === NODE_MODULES_ALTERNATIVE_PATH) {
								asarPathAdded = true;
								paths.splice(i, 0, NODE_MODULES_ASAR_ALTERNATIVE_PATH);
								break;
							}
						}
						if (!asarPathAdded && appRoot) {
							paths.push(NODE_MODULES_ASAR_PATH);
						}
					}
					return paths;
				};
			}
			function fileUriFromPath(path3, config) {
				let pathName = path3.replace(/\\/g, '/');
				if (pathName.length > 0 && pathName.charAt(0) !== '/') {
					pathName = `/${pathName}`;
				}
				let uri;
				if (config.isWindows && pathName.startsWith('//')) {
					uri = encodeURI(`${config.scheme || 'file'}:${pathName}`);
				} else {
					uri = encodeURI(`${config.scheme || 'file'}://${config.fallbackAuthority || ''}${pathName}`);
				}
				return uri.replace(/#/g, '%23');
			}
			function setupNLS() {
				const process2 = safeProcess();
				let nlsConfig = { availableLanguages: {} };
				if (process2 && process2.env['VSCODE_NLS_CONFIG']) {
					try {
						nlsConfig = JSON.parse(process2.env['VSCODE_NLS_CONFIG']);
					} catch (e) {
					}
				}
				if (nlsConfig._resolvedLanguagePackCoreLocation) {
					const bundles = /* @__PURE__ */ Object.create(null);
					nlsConfig.loadBundle = function (bundle, language, cb) {
						const result = bundles[bundle];
						if (result) {
							cb(void 0, result);
							return;
						}
						safeReadNlsFile(nlsConfig._resolvedLanguagePackCoreLocation, `${bundle.replace(/\//g, '!')}.nls.json`).then(function (content) {
							const json = JSON.parse(content);
							bundles[bundle] = json;
							cb(void 0, json);
						}).catch((error) => {
							try {
								if (nlsConfig._corruptedFile) {
									safeWriteNlsFile(nlsConfig._corruptedFile, 'corrupted').catch(function (error2) {
										console.error(error2);
									});
								}
							} finally {
								cb(error, void 0);
							}
						});
					};
				}
				return nlsConfig;
			}
			function safeSandboxGlobals() {
				const globals = typeof self === 'object' ? self : typeof global === 'object' ? global : {};
				return globals.vscode;
			}
			function safeProcess() {
				const sandboxGlobals = safeSandboxGlobals();
				if (sandboxGlobals) {
					return sandboxGlobals.process;
				}
				if (typeof process !== 'undefined') {
					return process;
				}
				return void 0;
			}
			function safeIpcRenderer() {
				const sandboxGlobals = safeSandboxGlobals();
				if (sandboxGlobals) {
					return sandboxGlobals.ipcRenderer;
				}
				return void 0;
			}
			async function safeReadNlsFile(...pathSegments) {
				const ipcRenderer = safeIpcRenderer();
				if (ipcRenderer) {
					return ipcRenderer.invoke('vscode:readNlsFile', ...pathSegments);
				}
				if (fs2 && path2) {
					return (await fs2.promises.readFile(path2.join(...pathSegments))).toString();
				}
				throw new Error('Unsupported operation (read NLS files)');
			}
			function safeWriteNlsFile(path3, content) {
				const ipcRenderer = safeIpcRenderer();
				if (ipcRenderer) {
					return ipcRenderer.invoke('vscode:writeNlsFile', path3, content);
				}
				if (fs2) {
					return fs2.promises.writeFile(path3, content);
				}
				throw new Error('Unsupported operation (write NLS files)');
			}
			function avoidMonkeyPatchFromAppInsights() {
				if (typeof process === 'undefined') {
					console.warn('avoidMonkeyPatchFromAppInsights() is only available in node.js environments');
					return;
				}
				process.env['APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL'] = true;
				global['diagnosticsSource'] = {};
			}
			return {
				enableASARSupport,
				avoidMonkeyPatchFromAppInsights,
				setupNLS,
				fileUriFromPath
			};
		});
	}
});

// bootstrap-node.js
const require_bootstrap_node = __commonJS({
	'bootstrap-node.js'(exports) {
		'use strict';
		function setupCurrentWorkingDirectory() {
			const path2 = require('path');
			try {
				if (typeof process.env['VSCODE_CWD'] !== 'string') {
					process.env['VSCODE_CWD'] = process.cwd();
				}
				if (process.platform === 'win32') {
					process.chdir(path2.dirname(process.execPath));
				}
			} catch (err) {
				console.error(err);
			}
		}
		setupCurrentWorkingDirectory();
		exports.injectNodeModuleLookupPath = function (injectPath) {
			if (!injectPath) {
				throw new Error('Missing injectPath');
			}
			const Module = require('module');
			const path2 = require('path');
			const nodeModulesPath = path2.join(__dirname, '../node_modules');
			const originalResolveLookupPaths = Module._resolveLookupPaths;
			Module._resolveLookupPaths = function (moduleName, parent) {
				const paths = originalResolveLookupPaths(moduleName, parent);
				if (Array.isArray(paths)) {
					for (let i = 0, len = paths.length; i < len; i++) {
						if (paths[i] === nodeModulesPath) {
							paths.splice(i, 0, injectPath);
							break;
						}
					}
				}
				return paths;
			};
		};
		exports.removeGlobalNodeModuleLookupPaths = function () {
			const Module = require('module');
			const globalPaths = Module.globalPaths;
			const originalResolveLookupPaths = Module._resolveLookupPaths;
			Module._resolveLookupPaths = function (moduleName, parent) {
				const paths = originalResolveLookupPaths(moduleName, parent);
				let commonSuffixLength = 0;
				while (commonSuffixLength < paths.length && paths[paths.length - 1 - commonSuffixLength] === globalPaths[globalPaths.length - 1 - commonSuffixLength]) {
					commonSuffixLength++;
				}
				return paths.slice(0, paths.length - commonSuffixLength);
			};
		};
		exports.configurePortable = function (product2) {
			const fs2 = require('fs');
			const path2 = require('path');
			const appRoot = path2.dirname(__dirname);
			function getApplicationPath(path3) {
				if (process.env['VSCODE_DEV']) {
					return appRoot;
				}
				if (process.platform === 'darwin') {
					return path3.dirname(path3.dirname(path3.dirname(appRoot)));
				}
				return path3.dirname(path3.dirname(appRoot));
			}
			function getPortableDataPath(path3) {
				if (process.env['VSCODE_PORTABLE']) {
					return process.env['VSCODE_PORTABLE'];
				}
				if (process.platform === 'win32' || process.platform === 'linux') {
					return path3.join(getApplicationPath(path3), 'data');
				}
				const portableDataName = product2.portable || `${product2.applicationName}-portable-data`;
				return path3.join(path3.dirname(getApplicationPath(path3)), portableDataName);
			}
			const portableDataPath = getPortableDataPath(path2);
			const isPortable = !('target' in product2) && fs2.existsSync(portableDataPath);
			const portableTempPath = path2.join(portableDataPath, 'tmp');
			const isTempPortable = isPortable && fs2.existsSync(portableTempPath);
			if (isPortable) {
				process.env['VSCODE_PORTABLE'] = portableDataPath;
			} else {
				delete process.env['VSCODE_PORTABLE'];
			}
			if (isTempPortable) {
				if (process.platform === 'win32') {
					process.env['TMP'] = portableTempPath;
					process.env['TEMP'] = portableTempPath;
				} else {
					process.env['TMPDIR'] = portableTempPath;
				}
			}
			return {
				portableDataPath,
				isPortable
			};
		};
	}
});

// vs/platform/environment/node/userDataPath.js
const require_userDataPath = __commonJS({
	'vs/platform/environment/node/userDataPath.js'(exports, module2) {
		'use strict';
		(function () {
			'use strict';
			function factory(path2, os2, productName, cwd) {
				function getUserDataPath2(cliArgs) {
					const userDataPath2 = doGetUserDataPath(cliArgs);
					const pathsToResolve = [userDataPath2];
					if (!path2.isAbsolute(userDataPath2)) {
						pathsToResolve.unshift(cwd);
					}
					return path2.resolve(...pathsToResolve);
				}
				function doGetUserDataPath(cliArgs) {
					const portablePath = process.env['VSCODE_PORTABLE'];
					if (portablePath) {
						return path2.join(portablePath, 'user-data');
					}
					let appDataPath = process.env['VSCODE_APPDATA'];
					if (appDataPath) {
						return path2.join(appDataPath, productName);
					}
					const cliPath = cliArgs['user-data-dir'];
					if (cliPath) {
						return cliPath;
					}
					switch (process.platform) {
						case 'win32':
							appDataPath = process.env['APPDATA'];
							if (!appDataPath) {
								const userProfile = process.env['USERPROFILE'];
								if (typeof userProfile !== 'string') {
									throw new Error('Windows: Unexpected undefined %USERPROFILE% environment variable');
								}
								appDataPath = path2.join(userProfile, 'AppData', 'Roaming');
							}
							break;
						case 'darwin':
							appDataPath = path2.join(os2.homedir(), 'Library', 'Application Support');
							break;
						case 'linux':
							appDataPath = process.env['XDG_CONFIG_HOME'] || path2.join(os2.homedir(), '.config');
							break;
						default:
							throw new Error('Platform not supported');
					}
					return path2.join(appDataPath, productName);
				}
				return {
					getUserDataPath: getUserDataPath2
				};
			}
			if (typeof define === 'function') {
				define(['require', 'path', 'os', 'vs/base/common/network', 'vs/base/common/resources', 'vs/base/common/process'], function (require2, path2, os2, network, resources, process2) {
					const rootPath = resources.dirname(network.FileAccess.asFileUri('', require2));
					const pkg = require2.__$__nodeRequire(resources.joinPath(rootPath, 'package.json').fsPath);
					return factory(path2, os2, pkg.name, process2.cwd());
				});
			} else if (typeof module2 === 'object' && typeof module2.exports === 'object') {
				const pkg = require('../package.json');
				const path2 = require('path');
				const os2 = require('os');
				module2.exports = factory(path2, os2, pkg.name, process.env['VSCODE_CWD'] || process.cwd());
			} else {
				throw new Error('Unknown context');
			}
		})();
	}
});

// vs/base/common/stripComments.js
const require_stripComments = __commonJS({
	'vs/base/common/stripComments.js'(exports, module2) {
		'use strict';
		(function () {
			function factory(path2, os2, productName, cwd) {
				const regexp = /('[^'\\]*(?:\\.[^'\\]*)*')|('[^'\\]*(?:\\.[^'\\]*)*')|(\/\*[^\/\*]*(?:(?:\*|\/)[^\/\*]*)*?\*\/)|(\/{2,}.*?(?:(?:\r?\n)|$))|(,\s*[}\]])/g;
				function stripComments2(content) {
					return content.replace(regexp, function (match, _m1, _m2, m3, m4, m5) {
						if (m3) {
							return '';
						} else if (m4) {
							const length = m4.length;
							if (m4[length - 1] === '\n') {
								return m4[length - 2] === '\r' ? '\r\n' : '\n';
							} else {
								return '';
							}
						} else if (m5) {
							return match.substring(1);
						} else {
							return match;
						}
					});
				}
				return {
					stripComments: stripComments2
				};
			}
			if (typeof define === 'function') {
				define([], function () {
					return factory();
				});
			} else if (typeof module2 === 'object' && typeof module2.exports === 'object') {
				module2.exports = factory();
			} else {
				console.trace('strip comments defined in UNKNOWN context (neither requirejs or commonjs)');
			}
		})();
	}
});

// vs/base/node/languagePacks.js
const require_languagePacks = __commonJS({
	'vs/base/node/languagePacks.js'(exports, module2) {
		'use strict';
		(function () {
			'use strict';
			function factory(nodeRequire, path2, fs2, perf2) {
				function exists(file) {
					return new Promise((c) => fs2.exists(file, c));
				}
				function touch(file) {
					return new Promise((c, e) => {
						const d = new Date();
						fs2.utimes(file, d, d, (err) => err ? e(err) : c());
					});
				}
				function mkdirp2(dir) {
					return new Promise((c, e) => fs2.mkdir(dir, { recursive: true }, (err) => err && err.code !== 'EEXIST' ? e(err) : c(dir)));
				}
				function rimraf(location) {
					return new Promise((c, e) => fs2.rm(location, { recursive: true, force: true, maxRetries: 3 }, (err) => err ? e(err) : c()));
				}
				function readFile(file) {
					return new Promise((c, e) => fs2.readFile(file, 'utf8', (err, data) => err ? e(err) : c(data)));
				}
				function writeFile(file, content) {
					return new Promise((c, e) => fs2.writeFile(file, content, 'utf8', (err) => err ? e(err) : c()));
				}
				function getLanguagePackConfigurations(userDataPath2) {
					const configFile = path2.join(userDataPath2, 'languagepacks.json');
					try {
						return nodeRequire(configFile);
					} catch (err) {
					}
					return void 0;
				}
				function resolveLanguagePackLocale(config, locale2) {
					try {
						while (locale2) {
							if (config[locale2]) {
								return locale2;
							} else {
								const index = locale2.lastIndexOf('-');
								if (index > 0) {
									locale2 = locale2.substring(0, index);
								} else {
									return void 0;
								}
							}
						}
					} catch (err) {
						console.error('Resolving language pack configuration failed.', err);
					}
					return void 0;
				}
				function getNLSConfiguration(commit, userDataPath2, metaDataFile2, locale2) {
					if (locale2 === 'pseudo') {
						return Promise.resolve({ locale: locale2, availableLanguages: {}, pseudo: true });
					}
					if (process.env['VSCODE_DEV']) {
						return Promise.resolve({ locale: locale2, availableLanguages: {} });
					}
					if (locale2 && (locale2 === 'en' || locale2 === 'en-us')) {
						return Promise.resolve({ locale: locale2, availableLanguages: {} });
					}
					const initialLocale = locale2;
					perf2.mark('code/willGenerateNls');
					const defaultResult = function (locale3) {
						perf2.mark('code/didGenerateNls');
						return Promise.resolve({ locale: locale3, availableLanguages: {} });
					};
					try {
						if (!commit) {
							return defaultResult(initialLocale);
						}
						const configs = getLanguagePackConfigurations(userDataPath2);
						if (!configs) {
							return defaultResult(initialLocale);
						}
						locale2 = resolveLanguagePackLocale(configs, locale2);
						if (!locale2) {
							return defaultResult(initialLocale);
						}
						const packConfig = configs[locale2];
						let mainPack;
						if (!packConfig || typeof packConfig.hash !== 'string' || !packConfig.translations || typeof (mainPack = packConfig.translations['vscode']) !== 'string') {
							return defaultResult(initialLocale);
						}
						return exists(mainPack).then((fileExists) => {
							if (!fileExists) {
								return defaultResult(initialLocale);
							}
							const packId = packConfig.hash + '.' + locale2;
							const cacheRoot = path2.join(userDataPath2, 'clp', packId);
							const coreLocation = path2.join(cacheRoot, commit);
							const translationsConfigFile = path2.join(cacheRoot, 'tcf.json');
							const corruptedFile = path2.join(cacheRoot, 'corrupted.info');
							const result = {
								locale: initialLocale,
								availableLanguages: { '*': locale2 },
								_languagePackId: packId,
								_translationsConfigFile: translationsConfigFile,
								_cacheRoot: cacheRoot,
								_resolvedLanguagePackCoreLocation: coreLocation,
								_corruptedFile: corruptedFile
							};
							return exists(corruptedFile).then((corrupted) => {
								let toDelete;
								if (corrupted) {
									toDelete = rimraf(cacheRoot);
								} else {
									toDelete = Promise.resolve(void 0);
								}
								return toDelete.then(() => {
									return exists(coreLocation).then((fileExists2) => {
										if (fileExists2) {
											touch(coreLocation).catch(() => {
											});
											perf2.mark('code/didGenerateNls');
											return result;
										}
										return mkdirp2(coreLocation).then(() => {
											return Promise.all([readFile(metaDataFile2), readFile(mainPack)]);
										}).then((values) => {
											const metadata = JSON.parse(values[0]);
											const packData = JSON.parse(values[1]).contents;
											const bundles = Object.keys(metadata.bundles);
											const writes = [];
											for (const bundle of bundles) {
												const modules = metadata.bundles[bundle];
												const target = /* @__PURE__ */ Object.create(null);
												for (const module3 of modules) {
													const keys = metadata.keys[module3];
													const defaultMessages = metadata.messages[module3];
													const translations = packData[module3];
													let targetStrings;
													if (translations) {
														targetStrings = [];
														for (let i = 0; i < keys.length; i++) {
															const elem = keys[i];
															const key = typeof elem === 'string' ? elem : elem.key;
															let translatedMessage = translations[key];
															if (translatedMessage === void 0) {
																translatedMessage = defaultMessages[i];
															}
															targetStrings.push(translatedMessage);
														}
													} else {
														targetStrings = defaultMessages;
													}
													target[module3] = targetStrings;
												}
												writes.push(writeFile(path2.join(coreLocation, bundle.replace(/\//g, '!') + '.nls.json'), JSON.stringify(target)));
											}
											writes.push(writeFile(translationsConfigFile, JSON.stringify(packConfig.translations)));
											return Promise.all(writes);
										}).then(() => {
											perf2.mark('code/didGenerateNls');
											return result;
										}).catch((err) => {
											console.error('Generating translation files failed.', err);
											return defaultResult(locale2);
										});
									});
								});
							});
						});
					} catch (err) {
						console.error('Generating translation files failed.', err);
						return defaultResult(locale2);
					}
				}
				return {
					getNLSConfiguration
				};
			}
			if (typeof define === 'function') {
				define(['require', 'path', 'fs', 'vs/base/common/performance'], function (require2, path2, fs2, perf2) {
					return factory(require2.__$__nodeRequire, path2, fs2, perf2);
				});
			} else if (typeof module2 === 'object' && typeof module2.exports === 'object') {
				const path2 = require('path');
				const fs2 = require('fs');
				module2.exports = factory(require, path2, fs2, perf);
			} else {
				throw new Error('Unknown context');
			}
		})();
	}
});

// bootstrap-amd.js
const require_bootstrap_amd = __commonJS({
	'bootstrap-amd.js'(exports) {
		'use strict';
		const loader = require('./vs/loader');
		const bootstrap2 = require_bootstrap();
		const nlsConfig = bootstrap2.setupNLS();
		loader.config({
			baseUrl: bootstrap2.fileUriFromPath(__dirname, { isWindows: process.platform === 'win32' }),
			catchError: true,
			nodeRequire: require,
			nodeMain: __filename,
			'vs/nls': nlsConfig,
			amdModulesPattern: /^vs\//,
			recordStats: true
		});
		if (process.env['ELECTRON_RUN_AS_NODE'] || process.versions['electron']) {
			loader.define('fs', ['original-fs'], function (originalFS) {
				return originalFS;
			});
		}
		if (nlsConfig && nlsConfig.pseudo) {
			loader(['vs/nls'], function (nlsPlugin) {
				nlsPlugin.setPseudoTranslation(nlsConfig.pseudo);
			});
		}
		exports.load = function (entrypoint, onLoad, onError) {
			if (!entrypoint) {
				return;
			}
			if (process.env['VSCODE_CODE_CACHE_PATH']) {
				loader.config({
					nodeCachedData: {
						path: process.env['VSCODE_CODE_CACHE_PATH'],
						seed: entrypoint
					}
				});
			}
			onLoad = onLoad || function () {
			};
			onError = onError || function (err) {
				console.error(err);
			};
			perf.mark(`code/fork/willLoadCode`);
			loader([entrypoint], onLoad, onError);
		};
	}
});

// main.js
const path = require('path');
const fs = require('fs');
const os = require('os');
const bootstrap = require_bootstrap();
const bootstrapNode = require_bootstrap_node();
const { getUserDataPath } = require_userDataPath();
const { stripComments } = require_stripComments();
const product = require('../product.json');
const { app, protocol, crashReporter } = require('electron');
const portable = bootstrapNode.configurePortable(product);
bootstrap.enableASARSupport();
const args = parseCLIArgs();
const userDataPath = getUserDataPath(args);
app.setPath('userData', userDataPath);
const codeCachePath = getCodeCachePath();
const argvConfig = configureCommandlineSwitchesSync(args);
perf.mark('code/willStartCrashReporter');
if (args['crash-reporter-directory'] || argvConfig['enable-crash-reporter'] && !args['disable-crash-reporter']) {
	configureCrashReporter();
}
perf.mark('code/didStartCrashReporter');
if (portable && portable.isPortable) {
	app.setAppLogsPath(path.join(userDataPath, 'logs'));
}
protocol.registerSchemesAsPrivileged([
	{
		scheme: 'vscode-webview',
		privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, allowServiceWorkers: true }
	},
	{
		scheme: 'vscode-file',
		privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true }
	}
]);
registerListeners();
const nlsConfigurationPromise = void 0;
const metaDataFile = path.join(__dirname, 'nls.metadata.json');
const locale = getUserDefinedLocale(argvConfig);
if (locale) {
	const { getNLSConfiguration } = require_languagePacks();
	nlsConfigurationPromise = getNLSConfiguration(product.commit, userDataPath, metaDataFile, locale);
}
app.once('ready', function () {
	if (args['trace']) {
		const contentTracing = require('electron').contentTracing;
		const traceOptions = {
			categoryFilter: args['trace-category-filter'] || '*',
			traceOptions: args['trace-options'] || 'record-until-full,enable-sampling'
		};
		contentTracing.startRecording(traceOptions).finally(() => onReady());
	} else {
		onReady();
	}
});
function startup(codeCachePath2, nlsConfig) {
	nlsConfig._languagePackSupport = true;
	process.env['VSCODE_NLS_CONFIG'] = JSON.stringify(nlsConfig);
	process.env['VSCODE_CODE_CACHE_PATH'] = codeCachePath2 || '';
	perf.mark('code/willLoadMainBundle');
	require_bootstrap_amd().load('vs/code/electron-main/main', () => {
		perf.mark('code/didLoadMainBundle');
	});
}
async function onReady() {
	perf.mark('code/mainAppReady');
	try {
		const [, nlsConfig] = await Promise.all([mkdirpIgnoreError(codeCachePath), resolveNlsConfiguration()]);
		startup(codeCachePath, nlsConfig);
	} catch (error) {
		console.error(error);
	}
}
function configureCommandlineSwitchesSync(cliArgs) {
	const SUPPORTED_ELECTRON_SWITCHES = [
		'disable-hardware-acceleration',
		'force-color-profile'
	];
	if (process.platform === 'linux') {
		SUPPORTED_ELECTRON_SWITCHES.push('force-renderer-accessibility');
	}
	const SUPPORTED_MAIN_PROCESS_SWITCHES = [
		'enable-proposed-api',
		'log-level'
	];
	const argvConfig2 = readArgvConfigSync();
	Object.keys(argvConfig2).forEach((argvKey) => {
		const argvValue = argvConfig2[argvKey];
		if (SUPPORTED_ELECTRON_SWITCHES.indexOf(argvKey) !== -1) {
			if (argvKey === 'force-color-profile') {
				if (argvValue) {
					app.commandLine.appendSwitch(argvKey, argvValue);
				}
			} else if (argvValue === true || argvValue === 'true') {
				if (argvKey === 'disable-hardware-acceleration') {
					app.disableHardwareAcceleration();
				} else {
					app.commandLine.appendSwitch(argvKey);
				}
			}
		} else if (SUPPORTED_MAIN_PROCESS_SWITCHES.indexOf(argvKey) !== -1) {
			switch (argvKey) {
				case 'enable-proposed-api':
					if (Array.isArray(argvValue)) {
						argvValue.forEach((id) => id && typeof id === 'string' && process.argv.push('--enable-proposed-api', id));
					} else {
						console.error(`Unexpected value for \`enable-proposed-api\` in argv.json. Expected array of extension ids.`);
					}
					break;
				case 'log-level':
					if (typeof argvValue === 'string') {
						process.argv.push('--log', argvValue);
					}
					break;
			}
		}
	});
	app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
	const jsFlags = getJSFlags(cliArgs);
	if (jsFlags) {
		app.commandLine.appendSwitch('js-flags', jsFlags);
	}
	return argvConfig2;
}
function readArgvConfigSync() {
	const argvConfigPath = getArgvConfigPath();
	let argvConfig2;
	try {
		argvConfig2 = JSON.parse(stripComments(fs.readFileSync(argvConfigPath).toString()));
	} catch (error) {
		if (error && error.code === 'ENOENT') {
			createDefaultArgvConfigSync(argvConfigPath);
		} else {
			console.warn(`Unable to read argv.json configuration file in ${argvConfigPath}, falling back to defaults (${error})`);
		}
	}
	if (!argvConfig2) {
		argvConfig2 = {};
	}
	return argvConfig2;
}
function createDefaultArgvConfigSync(argvConfigPath) {
	try {
		const argvConfigPathDirname = path.dirname(argvConfigPath);
		if (!fs.existsSync(argvConfigPathDirname)) {
			fs.mkdirSync(argvConfigPathDirname);
		}
		const defaultArgvConfigContent = [
			'// This configuration file allows you to pass permanent command line arguments to VS Code.',
			'// Only a subset of arguments is currently supported to reduce the likelihood of breaking',
			'// the installation.',
			'//',
			'// PLEASE DO NOT CHANGE WITHOUT UNDERSTANDING THE IMPACT',
			'//',
			'// NOTE: Changing this file requires a restart of VS Code.',
			'{',
			'	// Use software rendering instead of hardware accelerated rendering.',
			'	// This can help in cases where you see rendering issues in VS Code.',
			'	// "disable-hardware-acceleration": true',
			'}'
		];
		fs.writeFileSync(argvConfigPath, defaultArgvConfigContent.join('\n'));
	} catch (error) {
		console.error(`Unable to create argv.json configuration file in ${argvConfigPath}, falling back to defaults (${error})`);
	}
}
function getArgvConfigPath() {
	const vscodePortable = process.env['VSCODE_PORTABLE'];
	if (vscodePortable) {
		return path.join(vscodePortable, 'argv.json');
	}
	let dataFolderName = product.dataFolderName;
	if (process.env['VSCODE_DEV']) {
		dataFolderName = `${dataFolderName}-dev`;
	}
	return path.join(os.homedir(), dataFolderName, 'argv.json');
}
function configureCrashReporter() {
	let crashReporterDirectory = args['crash-reporter-directory'];
	let submitURL = '';
	if (crashReporterDirectory) {
		crashReporterDirectory = path.normalize(crashReporterDirectory);
		if (!path.isAbsolute(crashReporterDirectory)) {
			console.error(`The path '${crashReporterDirectory}' specified for --crash-reporter-directory must be absolute.`);
			app.exit(1);
		}
		if (!fs.existsSync(crashReporterDirectory)) {
			try {
				fs.mkdirSync(crashReporterDirectory, { recursive: true });
			} catch (error) {
				console.error(`The path '${crashReporterDirectory}' specified for --crash-reporter-directory does not seem to exist or cannot be created.`);
				app.exit(1);
			}
		}
		console.log(`Found --crash-reporter-directory argument. Setting crashDumps directory to be '${crashReporterDirectory}'`);
		app.setPath('crashDumps', crashReporterDirectory);
	} else {
		const appCenter = product.appCenter;
		if (appCenter) {
			const isWindows = process.platform === 'win32';
			const isLinux = process.platform === 'linux';
			const isDarwin = process.platform === 'darwin';
			const crashReporterId = argvConfig['crash-reporter-id'];
			const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
			if (uuidPattern.test(crashReporterId)) {
				if (isWindows) {
					switch (process.arch) {
						case 'ia32':
							submitURL = appCenter['win32-ia32'];
							break;
						case 'x64':
							submitURL = appCenter['win32-x64'];
							break;
						case 'arm64':
							submitURL = appCenter['win32-arm64'];
							break;
					}
				} else if (isDarwin) {
					if (product.darwinUniversalAssetId) {
						submitURL = appCenter['darwin-universal'];
					} else {
						switch (process.arch) {
							case 'x64':
								submitURL = appCenter['darwin'];
								break;
							case 'arm64':
								submitURL = appCenter['darwin-arm64'];
								break;
						}
					}
				} else if (isLinux) {
					submitURL = appCenter['linux-x64'];
				}
				submitURL = submitURL.concat('&uid=', crashReporterId, '&iid=', crashReporterId, '&sid=', crashReporterId);
				const argv = process.argv;
				const endOfArgsMarkerIndex = argv.indexOf('--');
				if (endOfArgsMarkerIndex === -1) {
					argv.push('--crash-reporter-id', crashReporterId);
				} else {
					argv.splice(endOfArgsMarkerIndex, 0, '--crash-reporter-id', crashReporterId);
				}
			}
		}
	}
	const productName = (product.crashReporter ? product.crashReporter.productName : void 0) || product.nameShort;
	const companyName = (product.crashReporter ? product.crashReporter.companyName : void 0) || 'Microsoft';
	const uploadToServer = !process.env['VSCODE_DEV'] && submitURL && !crashReporterDirectory;
	crashReporter.start({
		companyName,
		productName: process.env['VSCODE_DEV'] ? `${productName} Dev` : productName,
		submitURL,
		uploadToServer,
		compress: true
	});
}
function getJSFlags(cliArgs) {
	const jsFlags = [];
	if (cliArgs['js-flags']) {
		jsFlags.push(cliArgs['js-flags']);
	}
	if (cliArgs['max-memory'] && !/max_old_space_size=(\d+)/g.exec(cliArgs['js-flags'])) {
		jsFlags.push(`--max_old_space_size=${cliArgs['max-memory']}`);
	}
	return jsFlags.length > 0 ? jsFlags.join(' ') : null;
}
function parseCLIArgs() {
	const minimist = require('minimist');
	return minimist(process.argv, {
		string: [
			'user-data-dir',
			'locale',
			'js-flags',
			'max-memory',
			'crash-reporter-directory'
		]
	});
}
function registerListeners() {
	const macOpenFiles = [];
	global['macOpenFiles'] = macOpenFiles;
	app.on('open-file', function (event, path2) {
		macOpenFiles.push(path2);
	});
	const openUrls = [];
	const onOpenUrl = function (event, url) {
		event.preventDefault();
		openUrls.push(url);
	};
	app.on('will-finish-launching', function () {
		app.on('open-url', onOpenUrl);
	});
	global['getOpenUrls'] = function () {
		app.removeListener('open-url', onOpenUrl);
		return openUrls;
	};
}
function getCodeCachePath() {
	if (process.argv.indexOf('--no-cached-data') > 0) {
		return void 0;
	}
	if (process.env['VSCODE_DEV']) {
		return void 0;
	}
	const commit = product.commit;
	if (!commit) {
		return void 0;
	}
	return path.join(userDataPath, 'CachedData', commit);
}
function mkdirp(dir) {
	return new Promise((resolve, reject) => {
		fs.mkdir(dir, { recursive: true }, (err) => err && err.code !== 'EEXIST' ? reject(err) : resolve(dir));
	});
}
async function mkdirpIgnoreError(dir) {
	if (typeof dir === 'string') {
		try {
			await mkdirp(dir);
			return dir;
		} catch (error) {
		}
	}
	return void 0;
}
async function resolveNlsConfiguration() {
	let nlsConfiguration = nlsConfigurationPromise ? await nlsConfigurationPromise : void 0;
	if (!nlsConfiguration) {
		let appLocale = app.getLocale();
		if (!appLocale) {
			nlsConfiguration = { locale: 'en', availableLanguages: {} };
		} else {
			appLocale = appLocale.toLowerCase();
			const { getNLSConfiguration } = require_languagePacks();
			nlsConfiguration = await getNLSConfiguration(product.commit, userDataPath, metaDataFile, appLocale);
			if (!nlsConfiguration) {
				nlsConfiguration = { locale: appLocale, availableLanguages: {} };
			}
		}
	} else {
	}
	return nlsConfiguration;
}
function getUserDefinedLocale(argvConfig2) {
	const locale2 = args['locale'];
	if (locale2) {
		return locale2.toLowerCase();
	}
	return argvConfig2.locale && typeof argvConfig2.locale === 'string' ? argvConfig2.locale.toLowerCase() : void 0;
}
