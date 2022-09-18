/* eslint-disable @typescript-eslint/ban-ts-comment */
import { defineConfig } from "@restack-run/core";
import { VitePWA } from "vite-plugin-pwa";
import legacy from "@vitejs/plugin-legacy";

export default defineConfig({
	vite: {
		plugins: [
			legacy({
				targets: ["defaults", "not IE 11"],
			}),
			VitePWA({
				mode: "production",
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
		}
	}
});
