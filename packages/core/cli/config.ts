import { loadConfigFromFile, mergeConfig } from "vite";
import react from "@vitejs/plugin-react";
import viteCompression from "vite-plugin-compression";
import svgrPlugin from "vite-plugin-svgr";
//import legacy from "@vitejs/plugin-legacy";
import type { UserConfig, UserConfigExport } from "./types";

import fs from "fs-extra";

const tsConfigPath = "restack.config.ts";
const jsConfigPath = "restack.config.js";

const jsServerEntryPath = "src/server.entry.js";
const tsServerEntryPath = "src/server.entry.ts";

const defaultConfig: UserConfigExport = {
	cacheDir: "cache",
	outDir: "dist",
	vite: {
		plugins: [
			// legacy({
			// 	targets: ["defaults", "not IE 11"],
			// }),
			react(),
			svgrPlugin({
				svgrOptions: {
					icon: true,
					// ...svgr options (https://react-svgr.com/docs/options/)
				},
			}),
			// gizp
			viteCompression({
				threshold: 1024 * 10,
			}),
			// br
			viteCompression({
				threshold: 1024 * 10,
				ext: ".br",
				algorithm: "brotliCompress",
			}),
		],
		esbuild: {
			banner: "/* ReStack APP",
			footer: "/* https://restack.run */",
			legalComments: "none",
		},
		build: {
			sourcemap: true,
			rollupOptions: {
				output: {
					sourcemapExcludeSources: true, //exclude source content from map in production, just line number and column
					assetFileNames: (file) => {
						const path = "assets/$/[name]-[hash].[ext]";

						if (file?.name?.endsWith(".css"))
							return path.replace("$", "css");
						else if (
							file?.name?.endsWith(".woff") ||
							file?.name?.endsWith(".woff2") ||
							file?.name?.endsWith(".ttf") ||
							file?.name?.endsWith(".eot")
						)
							return path.replace("$", "fonts");

						return path.replace("$", "media");
					},
				},
			},
		}
	},
	restack: {
		validation : true,
		external : [],
		apiPrefix: "/api",
		routesDir: "src/routes",
		outFile: "index.js",
		port: 8080,
	},
};

export default async function config(configFile): Promise<UserConfig> {
	if (!configFile) {
		configFile =
			(fs.existsSync(tsConfigPath) && tsConfigPath) ||
			(fs.existsSync(jsConfigPath) && jsConfigPath) ||
			undefined;
	}

	let config: any = {};

	if (configFile) {
		config = await loadConfigFromFile(
			{
				command: "build",
				mode: "development",
			},
			configFile
		);
	}

	const mergedConfig: UserConfig = mergeConfig(
		defaultConfig,
		config.config
	) as UserConfig;

	if (mergedConfig.restack.routesDir.startsWith(".."))
		throw new Error(
			"Restack routesDir config must start from same config folder so .. not allowed"
		);
	else if (mergedConfig.restack.routesDir.startsWith("./"))
		mergedConfig.restack.routesDir =
			mergedConfig.restack.routesDir.substring(2);
	else if (mergedConfig.restack.routesDir.startsWith("/"))
		mergedConfig.restack.routesDir =
			mergedConfig.restack.routesDir.substring(1);

	mergedConfig.vite.server = {
		proxy: {
			[mergedConfig.restack.apiPrefix]: {
				target: `http://localhost:${mergedConfig.restack.port}`,
				changeOrigin: true,
			},
		},
	};

	if (!mergedConfig.restack.serverEntryPath) {
		mergedConfig.restack.serverEntryPath =
			(fs.existsSync(tsServerEntryPath) && tsServerEntryPath) ||
			(fs.existsSync(jsServerEntryPath) && jsServerEntryPath) ||
			undefined;
	} else {
		if (fs.existsSync(mergedConfig.restack.serverEntryPath))
			throw new Error(
				`server entry file not found on path : ${mergedConfig.restack.serverEntryPath}`
			);
	}

	return mergedConfig;
}

export function defineConfig(config: UserConfigExport): UserConfigExport {
	return config;
}
