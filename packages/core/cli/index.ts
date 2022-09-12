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
	.option("--config <path>", "set config file to use", undefined);

commander.parse(process.argv);

const options = commander.opts();

void config(options.config).then(async (config) => {
	config.build = options.build;
	config.preview = options.preview;
	
	await restack(config);

	void vite(config);
});
