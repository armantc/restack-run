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
import { FileSystemCache } from "file-system-cache";
import md5File from "md5-file";

const fCache = new FileSystemCache({
	basePath : "./cache"
});

const validRouteExts = ["js", "ts", "jsx", "tsx"];

let nodeProcess: ChildProcessWithoutNullStreams;

let cacheDir : string;

export default async function restack(config: UserConfig) {

	let outDir = config.outDir;

	cacheDir = path.join(config.cacheDir, ".restack");

	if(!config.build && !config.preview) //dev mode
	{
		outDir = cacheDir;
	}

	const bundlePath = path.join(outDir, config.restack.outFile);

	if (config.preview) {
		const bundlePathCJS = bundlePath.substring(0,bundlePath.lastIndexOf(".js")) + ".cjs";
		if (fs.existsSync(bundlePath)) runServer(config, bundlePath);
		else if(fs.existsSync(bundlePathCJS))
			runServer(config, bundlePathCJS);
		else
			console.log(
				chalk.red("failed"),
				" start preview server, cannot resolve bundle file : ",
				chalk.dim(bundlePath)
			);

		return;
	} else {
		rimraf.sync(path.join(outDir, "/**/*"));

		generateServerEntry(config,cacheDir);

		const debounceRunServer = lodash.debounce(() => {
			runServer(config, bundlePath);
		}, 500);

		const esbuildOpts: esbuild.BuildOptions = {
			entryPoints: [generateEntryOutPath(cacheDir)], //must compare with destination and remove not existing entries
			treeShaking: true, //remove dead code
			external : config.restack.external,
			platform: "node",
			bundle: true,
			format: config.independent ? "cjs" : "esm",
			minify: config.build,
			outfile: bundlePath,
			plugins: [PluginRestackTransform(config)],
			sourcemap: true,
			incremental: !config.build,
			watch: !config.build && {
				onRebuild(error, result) {
					if (error) console.log(error);
					else {
						debounceRunServer();
					}
				},
			},
		};

		if (!config.independent)
			esbuildOpts.external = [
				"./node_modules/*",
				"../node_modules/*",
				"../../node_modules/*",
				"../../../node_modules/*",
			];
		else
			//fix issue if used with package json type module
			esbuildOpts.outfile = 
				esbuildOpts.outfile?.substring(0,esbuildOpts.outfile.lastIndexOf(".")) + ".cjs";

		const result = await esbuild.build(esbuildOpts);

		logResult(result);

		if (config.build) return;

		runServer(config, bundlePath,true);

		const watchPaths: string[] = [];

		for (const ext of validRouteExts) {
			watchPaths.push(
				path
					.join(config.restack.routesDir, `/**/*.${ext}`)
					.replaceAll("\\", "/")
			);
		}

		const debounceGenServerEntry = lodash.debounce(() => {
			generateServerEntry(config,cacheDir);
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

function runServer(config: UserConfig, bundlePath: string,firstRun = false) {

	let checksums = fCache.getSync("checksums");
	checksums = checksums || {};

	const entryFilePath = generateEntryOutPath(cacheDir);

	const entryChecksum = md5File.sync(entryFilePath);
	const bundleChecksum = md5File.sync(bundlePath);

	if(checksums && !firstRun){
		if(checksums.entry === entryChecksum && checksums.bundle === bundleChecksum){
			//no change detected on backend
			return;
		}
	}

	fCache.setSync("checksums", {
		entry: entryChecksum,
		bundle: bundleChecksum,
	});

	if (nodeProcess) {
		try {
			nodeProcess.kill();
		} catch (e) {
			console.log(e);
		}
	}

	nodeProcess = spawn("node", [bundlePath], {
		env: {
			...process.env,
			NODE_ENV:
				config.build || config.preview ? "production" : "development",
		},
	});

	nodeProcess.stdout.pipe(process.stdout);

	console.log(chalk.blue("START"), " server");
}

function generateServerEntry(config: UserConfig, cacheDir : string) {

	const relativePath = path.relative(cacheDir, ".").replaceAll("\\", "/");

	const entries = fg.sync(
		`${path
			.join(config.restack.routesDir, "/**/*")
			.replaceAll("\\", "/")}.{${validRouteExts.join(",")}}`,
		{
			onlyFiles: true,
			dot: true,
		}
	);

	let content = 'import restackServer from "@restack-run/server";\r\n';

	const imports: string[] = [];

	for (const entry of entries) {
		let importPath = path.join(relativePath, entry).replaceAll("\\", "/");

		const importName = generateDefaultImportName(
			entry,
			config.restack.routesDir
		);

		importPath = importPath.substring(0, importPath.lastIndexOf(".")); //remove extension

		imports.push(`import ${importName} from "${importPath}";`);

	}

	content += imports.join("\n");

	content += `
	import rsnPath , { dirname as rsnDirname } from 'path';
	import { fileURLToPath as rsnFileURLToPath } from 'url';
	let rsnWorkingDir = import.meta.url;
	if(rsnWorkingDir)
		rsnWorkingDir = rsnDirname(rsnFileURLToPath(rsnWorkingDir));
	else
		rsnWorkingDir = __dirname;
	
	restackServer.start(
		${config.restack.port},
		"${config.restack.apiPrefix}",
		rsnPath.join(rsnWorkingDir,"./static")
		);
	`;

	if (config.restack.serverEntryPath) {
		let entryImportPath = 
			path.join(relativePath,config.restack.serverEntryPath).replaceAll("\\", "/");

		entryImportPath = entryImportPath.substring(0,entryImportPath.lastIndexOf("."));

		content = `import "${entryImportPath}";\r\n` + content;
	}

	const entryOutPath = generateEntryOutPath(cacheDir);

	fs.outputFileSync(entryOutPath, content);

	console.log(chalk.green("DONE"), " Write restack server entry file");
}

function generateEntryOutPath(cacheDir){
	return path.join(cacheDir, "entry.server.js");
}

function generateDefaultImportName(entry: string, routesDir: string) {
	let defName = entry.replace(routesDir, "");
	defName = defName.substring(0, defName.lastIndexOf(".")); //remove extension
	defName = lodash.camelCase(defName); //convert to camelCase and remove extra characters

	return defName;
}

export function convertToRoute(relativeRoutePath) {
	const parts = relativeRoutePath.split("/");

	const params : string[] = [];

	let fileName = parts[parts.length - 1];
	fileName = fileName.substring(0, fileName.lastIndexOf("."));
	parts[parts.length - 1] = fileName;
	
	if (fileName.toLowerCase() === "index") parts.pop();

	parts.forEach((value, index, array) => {
		if (value.startsWith("$")){ 
			value = value.replace("$", ":");
			params.push((value as string).substring(1))
		}
		array[index] = value;
	});

	let url = parts.join("/");

	url = url === "" ? "/" : url;

	return {
		url,
		params
	}
}
