/* eslint-disable @typescript-eslint/ban-ts-comment */
import { createServer ,build ,  defineConfig , PluginOption, InlineConfig , loadConfigFromFile } from "vite";
import react from "@vitejs/plugin-react";
import viteCompression from "vite-plugin-compression";
import svgrPlugin from "vite-plugin-svgr";
import legacy from "@vitejs/plugin-legacy";
import viteReStackPlugin from "../vite-plugin";

const defaultConfig = defineConfig({
	cacheDir: "cache/.vite",
	plugins: [
		viteReStackPlugin(),
		legacy({
			targets: ["defaults", "not IE 11"],
		}),
		react(),
		svgrPlugin({
			svgrOptions: {
				icon: true,
				// ...svgr options (https://react-svgr.com/docs/options/)
			},
		}) as PluginOption,
		// gizp
		viteCompression({
			threshold: 1024 * 10,
		}) as PluginOption,
		// br
		viteCompression({
			threshold: 1024 * 10,
			ext: ".br",
			algorithm: "brotliCompress",
		}) as PluginOption,
	],
	build: {
		outDir : "dist/client",
		sourcemap: true,
		rollupOptions: {
			output: {
				sourcemapExcludeSources : true, //exclude source content from map in production, just line number and column
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
			}
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
});

export default async function vite(mode = "dev" ){

	if(mode === "dev")
	{
		const server = await createServer(defaultConfig as InlineConfig);

		await server.listen();
		server.printUrls();
	}else{
		//production build
		await build(defaultConfig as InlineConfig);
	}
}