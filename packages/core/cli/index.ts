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
import chokidar from "chokidar";
import lodash from "lodash";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import logSymbols from "log-symbols";
import vite from "./vite";
import config from "./config";
import restack from "./restack";

export const validRouteExts = ["js", "ts", "jsx", "tsx"];

commander
	.description("Transform restack codes to runnable code")
	.option("build", "Generate and bundle runnable code for production", false)
	.option("preview", "run builded code", false)
	.option("--config <path>", "set config file to use", undefined)
	.option(
		"--independent",
		"if set true bundle with all external modules and no need npm install anymore, suitable for serverless like CloudFlare Workers, and pushing server codes",
		false
	);

commander.parse(process.argv);

const options = commander.opts();

void config(options.config).then(async (config) => {
	config.build = options.build;
	config.preview = options.preview;
	config.independent = options.independent;

	if(!config.build && !config.preview) //dev mode
		config.restack.outDir = path.join(config.restack.cacheDir,config.restack.outDir)
		.replaceAll("\\", "/");

	await restack(config);

	void vite(config);
});
