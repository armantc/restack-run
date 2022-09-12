/* eslint-disable no-console */
/* eslint-disable import/no-named-as-default-member */
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
import type { UserConfig } from "./types";

const validRouteExts = ["js", "ts", "jsx", "tsx"];

let nodeProcess: ChildProcessWithoutNullStreams;

export default async function restack(config: UserConfig) {
	const bundlePath = path.join(config.restack.outDir, config.restack.outFile);

	if (config.preview) {
		if (fs.existsSync(bundlePath)) runServer(config, bundlePath);
		else
			console.log(
				chalk.red("failed"),
				" start preview server, cannot resolve bundle file : ",
				chalk.dim(bundlePath)
			);

		return;
	} else {

		rimraf.sync(path.join(config.restack.outDir, "/**/*"));

		generateServerEntry(config.restack.routesDir);

		const debounceRunServer = lodash.debounce(() => {
			runServer(config,bundlePath);
		}, 500);

		const result = await esbuild.build({
			entryPoints: ["./cache/.restack/server.entry.js"], //must compare with destination and remove not existing entries
			treeShaking: true, //remove dead code
			platform: "node",
			bundle: true,
			format: "esm",
			external: [
				"./node_modules/*",
				"../node_modules/*",
				"../../node_modules/*",
				"../../../node_modules/*",
			],
			minify: config.build,
			outfile: bundlePath,
			plugins: [PluginRestackTransform],
			sourcemap: true,
			incremental: !config.build,
			watch: !config.build && {
                onRebuild(error, result) {
                    if(error)
                        console.log(error);
                    else
                    {
						debounceRunServer();
                        console.log(result);
                    }
                },
            },
		});

		logResult(result);

		if(config.build)
			return;

		runServer(config,bundlePath);

		const watchPaths: string[] = [];

		for (const ext of validRouteExts) {
			watchPaths.push(
				path
					.join(config.restack.routesDir, `/**/*.${ext}`)
					.replaceAll("\\", "/")
			);
		}

        const debounceGenServerEntry = lodash.debounce(() => {
			generateServerEntry(config.restack.routesDir);
		}, 500);

		const onChange = (path: string) => {
			console.log(
				chalk.green("REBUILD"),
				" route change detected : ",
				chalk.dim(path)
			);

			debounceGenServerEntry();
		};

		chokidar
			.watch(watchPaths, {
				ignoreInitial: true,
			})
			.on("add", onChange)
			.on("unlink", onChange);
	}
}

function logResult(result: esbuild.BuildResult) {
	if (result.errors.length > 0) {
		console.log("bundle completed with errors : ", result.errors);
	} else if (result.warnings.length > 0) {
		console.log("bundle completed with warnings : ", result.warnings);
	} else {
		console.log("bundle completed with no errors or warnings");
	}
}

function runServer(config: UserConfig,bundlePath: string) {
	if (nodeProcess) {
		try {
			nodeProcess.kill();
		} catch (e) {
			console.log(e);
		}
	}

	nodeProcess = spawn(
		"node",
		[
			bundlePath,
		],
		{
			env: {
				...process.env,
				NODE_ENV:
					config.build || config.preview
						? "production"
						: "development",
			},
		}
	);

	// nodeProcess.stdout.on("data", (data) => {
	// 	console.log(`child stdout:\n${data}`);
	// });

	nodeProcess.stdout.pipe(process.stdout);

	console.log(chalk.blue("START"), " server");
}

function generateServerEntry(routesDir: string) {
	const entries = fg.sync(`${routesDir}/**/*.{${validRouteExts.join(",")}}`, {
		onlyFiles: true,
		dot: true,
	});

	let content = 'import restackServer from "@restack-run/server";\r\n';

	const imports: string[] = [];
	const registers: string[] = [];

	for (const entry of entries) {
		let importPath = path.join("../../", entry).replaceAll("\\", "/");

		const importName = generateDefaultImportName(entry, routesDir);

		importPath = importPath.substring(0, importPath.lastIndexOf(".")); //remove extension

		imports.push(`import ${importName} from "${importPath}";`);

		registers.push(
			`restackServer.register(${importName},"${generateBasePath(
				entry,
				routesDir
			)}");`
		);
	}

	content += [...imports, ...registers].join("\r\n");

	content += `\r\nrestackServer.start(${8080});`; //todo must apply port from config

	fs.outputFileSync("./cache/.restack/server.entry.js", content);

	console.log(chalk.green("DONE"), " Write restack server entry file");
}

function generateDefaultImportName(entry: string, routesDir: string) {
	let defName = entry.replace(routesDir, "");
	defName = defName.substring(0, defName.lastIndexOf(".")); //remove extension
	defName = lodash.camelCase(defName); //convert to camelCase and remove extra characters

	return defName;
}

function generateBasePath(entry: string, routesDir: string) {
	let defName = entry.replace(routesDir, "");
	defName = defName.substring(0, defName.lastIndexOf("/")); //remove file name

	return defName === "" ? "/" : defName;
}
