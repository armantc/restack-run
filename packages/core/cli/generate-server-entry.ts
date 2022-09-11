/* eslint-disable no-console */
import path from "path";
import fg from "fast-glob";
import chalk from "chalk";
import lodash from "lodash";
import fs from "fs-extra";
import { validRouteExts } from ".";

export default function generateServerEntry(routesDir: string) {
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
