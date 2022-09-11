import {PluginOption} from "vite";
import putout from "putout";
import replaceRestackImportsPlugin from "./replace-restack-imports-plugin";
import path from "path";
import convert from "convert-source-map";

export default function viteReStackPlugin(): PluginOption {

	let gen: Generator;

	return {
		name: "viteRestack",
		enforce: "pre",
		transform: async function (code, id) {
			if (id.endsWith(".jsx") || id.endsWith(".tsx")) {
				if (code.indexOf("@restack-run/server") >= 0) {

					const out = putout(code, {
						fix:true,
						isJSX: true,
						isTS: id.endsWith(".tsx"),
						sourceFileName: path.basename(id),
						sourceMapName : path.parse(id).name,
						plugins: [
							"typescript",
							[
								"replace-restack-imports-plugin",
								replaceRestackImportsPlugin,
							],
							"remove-unused-variables",
							"remove-useless-functions",
							"remove-unreachable-code",
						],
					});

					const _convert = convert.fromSource(out.code);

					return { code: convert.removeComments(out.code) , map : _convert.sourcemap};
				}
			}
		},
	};
}
