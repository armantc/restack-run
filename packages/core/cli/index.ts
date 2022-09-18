#!/usr/bin/env node

import commander from "commander";
import path from "path";
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

	config.vite.cacheDir = path.join(config.cacheDir, ".vite");
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	config.vite.build!.outDir = path.join(config.outDir, "static");


	await restack(config);

	void vite(config);
});
