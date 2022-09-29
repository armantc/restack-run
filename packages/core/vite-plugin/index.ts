import { PluginOption } from "vite";
import putout from "putout";
import replaceRestackServerPlugin from "./replace-restack-server-plugin";
import path from "path";
import convert from "convert-source-map";
import type { RestackConfig } from "../cli/types";

export default function viteReStackPlugin(config: RestackConfig): PluginOption {
	const routesAbsPath = path
		.join(process.cwd(), config.routesDir)
		.replaceAll("\\", "/");

	return {
		name: "viteRestack",
		enforce: "pre",
		transform: async function (code, id) {
			if (
				(id.endsWith(".jsx") || id.endsWith(".tsx")) &&
				id.startsWith(routesAbsPath)
			) {
				const out = putout(code, {
					fix: true,
					isJSX: true,
					isTS: id.endsWith(".tsx"),
					sourceFileName: path.basename(id),
					sourceMapName: path.parse(id).name,
					plugins: [
						"typescript",
						[
							"replace-restack-server-plugin",
							replaceRestackServerPlugin(id.substring(routesAbsPath.length)),
						],
						"remove-unused-variables",
						"remove-useless-functions",
						"remove-unreachable-code",
					],
				});

				const _convert = convert.fromSource(out.code);

				return {
					code: convert.removeComments(out.code),
					map: _convert.sourcemap,
				};
			}
		},
	};
}
