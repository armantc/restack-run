/* eslint-disable @typescript-eslint/ban-ts-comment */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import viteCompression from "vite-plugin-compression";
import svgrPlugin from "vite-plugin-svgr";
import { VitePWA } from "vite-plugin-pwa";
import legacy from "@vitejs/plugin-legacy";
import { viteReStackPlugin } from "@restack-run/core";

// https://vitejs.dev/config/
export default defineConfig({
	vite : {
	
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
		VitePWA({
			mode: "production",
			outDir : "dist/client",
			base: "/",
			srcDir: "src",
			includeAssets: ["favicon.svg", "robots.txt"],
			filename: "service-worker.js",
			strategies: "generateSW",
			registerType: "autoUpdate",
			workbox: {
				globPatterns: [
					"**.*",
					"**/*.{js,css,html,png,jpg,jpeg,gif,svg,eot,ttf,woff,woff2}",
				],
				maximumFileSizeToCacheInBytes: 5000000,
			},
			manifest: {
				name: "ReStack PWA APP",
				short_name: "ReStack",
				theme_color: "#b7b7c1",
				scope: "/",
				display: "standalone",
				icons: [
					{
						src: "pwa-192x192.png", // <== don't add slash, for testing
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "/pwa-512x512.png", // <== don't remove slash, for testing
						sizes: "512x512",
						type: "image/png",
					},
					{
						src: "pwa-512x512.png", // <== don't add slash, for testing
						sizes: "512x512",
						type: "image/png",
						purpose: "any maskable",
					},
				],
			},
		}),
	],
	esbuild: {
		banner: "/* ReStack APP by Md. Arman Kabir */",
		footer: "/* follow me on LinkedIn! https://www.linkedin.com/in/md-arman-kabir-63746728/ */",
		legalComments: "none",
	},
	build: {
		outDir : "dist/client",
		sourcemap: true, //in production, we disable sourcemap for security if you want to see source enable it
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
}
});
