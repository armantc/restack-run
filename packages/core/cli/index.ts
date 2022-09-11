#!/usr/bin/env node
/* eslint-disable no-console */
/* eslint-disable import/no-named-as-default-member */

import commander from "commander";
import fg from "fast-glob";
import fs from "fs-extra";
import esbuild from "esbuild";
import path from "path";
import rimraf from "rimraf";
import PluginRestackTransform from "./esbuild-plugin-restack-transform";
import chalk from "chalk";
import generateServerEntry from "./generate-server-entry";
import chokidar from "chokidar";
import lodash from "lodash";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import logSymbols from "log-symbols";
import vite from "./vite";
import config from "./config";

export const validRouteExts = ["js", "ts", "jsx", "tsx"];

commander
	.description("Transform restack codes to runnable code")
	.option("build", "Generate and bundle runnable code for production", false)
	.option("preview", "run builded code", false)
	.option("--config <path>", "set config file to use", undefined);

commander.parse(process.argv);

const options = commander.opts();

void config(options.config).then((config) => {
	config.build = options.build;
	config.preview = options.preview;

	console.log(chalk.blue("start transform"), " restack server code");

	rimraf.sync(`${config.restack?.outDir}/**/*`);

	generateServerEntry(config.restack?.routesDir);

	let nodeProcess: ChildProcessWithoutNullStreams;

	const outBundleFile = path.join(
		config.restack.outDir,
		config.restack.outFile
	);

	function runServer() {
		if (nodeProcess) {
			try {
				nodeProcess.kill();
			} catch (e) {
				console.log(e);
			}
		}

		nodeProcess = spawn("node", [outBundleFile]);

		// nodeProcess.stdout.on("data", (data) => {
		// 	console.log(`child stdout:\n${data}`);
		// });

		nodeProcess.stdout.pipe(process.stdout);

		console.log(chalk.blue("START"), " server");
	}

	if (!config.preview) {
		void esbuild
			.build({
				entryPoints: ["./cache/.restack/server.entry.js"], //must compare with destination and remove not existing entries
				treeShaking: !config.build, //remove dead code
				platform: "node",
				bundle: true,
				format: "esm",
				external: [
					"./node_modules/*",
					"../node_modules/*",
					"../../node_modules/*",
					"../../../node_modules/*",
				],
				minify: !config.build,
				outfile: outBundleFile,
				plugins: [PluginRestackTransform],
				sourcemap: true,
				incremental: !config.build,
			})
			.then((result) => {
				if (result.errors.length > 0) {
					console.log(
						chalk.red("DONE"),
						" Bundle ReStack server code with errors"
					);
					console.log(result.errors);
				} else if (result.warnings.length > 0) {
					console.log(
						chalk.yellow("DONE"),
						" Bundle ReStack server code with warnings"
					);
					console.log(result.warnings);
				} else {
					console.log(
						chalk.green("DONE"),
						" Bundled ReStack server code"
					);

					if (!config.build) {
						runServer();

						const watchPaths: string[] = [];

						for (const ext of validRouteExts) {
							watchPaths.push(
								path
									.join(
										config.restack.routesDir,
										`/**/*.${ext}`
									)
									.replaceAll("\\", "/")
							);
						}

						const debounceRebuild = lodash.debounce(() => {
							generateServerEntry(config.restack.routesDir);
							void result.rebuild?.().then((result) => {
								if (result.errors.length > 0) {
									console.log(
										chalk.red("DONE"),
										" Rebuild bundle ReStack server code with errors"
									);
									console.log(result.errors);
								} else if (result.warnings.length > 0) {
									console.log(
										chalk.yellow("DONE"),
										" Rebuild bundle ReStack server code with warnings"
									);
									console.log(result.warnings);
								} else {
									console.log(
										chalk.green("DONE"),
										" Rebuild bundle ReStack server code"
									);

									runServer();
								}
							});
						}, 100);

						const onChange = (path: string) => {
							console.log(
								chalk.green("REBUILD"),
								" file change detected : ",
								chalk.dim(path)
							);

							debounceRebuild();
						};

						chokidar
							.watch(watchPaths, {
								ignoreInitial: true,
							})
							.on("add", onChange)
							.on("change", onChange)
							.on("unlink", onChange);

						console.log(chalk.blue("START"), " watching on files");
					}
				}
			});
	}
});
