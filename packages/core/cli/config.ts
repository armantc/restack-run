import { loadConfigFromFile, mergeConfig } from "vite";
import react from "@vitejs/plugin-react";
import viteCompression from "vite-plugin-compression";
import svgrPlugin from "vite-plugin-svgr";
//import legacy from "@vitejs/plugin-legacy";
import viteReStackPlugin from "../vite-plugin";
import tsconfigPaths from "vite-tsconfig-paths";
import type { UserConfig,ExportUserConfig } from "./types";

import fs from "fs-extra";

const tsConfigPath = "restack.config.ts";
const jsConfigPath = "restack.config.js";

const defaultConfig = {
	vite: {
		cacheDir: "cache/.vite",
		plugins: [
			tsconfigPaths(),
			viteReStackPlugin(),
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
			outDir: "dist/client",
			sourcemap: true,
			rollupOptions: {
				output: {
					sourcemapExcludeSources: true, //exclude source content from map in production, just line number and column
					dir: "dist/client",
					assetFileNames: (file) => {
						const path = "static/$/[name]-[hash].[ext]";

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
		},
		server: {
			proxy: {
				"/api": {
					target: "http://localhost:8080",
					changeOrigin: true,
				},
			},
		},
	},
	restack: {
        apiPath : "/api",
		cacheDir: "cache/.restack",
		routesDir: "src/routes",
		outDir: "dist/server",
		outFile: "index.js",
	},
};

export default async function config(configFile) : Promise<UserConfig> {
	if (!configFile) {
		configFile =
			(fs.existsSync(tsConfigPath) && tsConfigPath) ||
			(fs.existsSync(jsConfigPath) && jsConfigPath);
	}

	let config : any = await loadConfigFromFile(
		{
			command: "build",
			mode: "development",
		},
		configFile
	);

	if (config) config = mergeConfig(defaultConfig, config.config);

	return config as Promise<UserConfig>;
}

export function defineConfig(config: ExportUserConfig) : ExportUserConfig {
    return config;
}