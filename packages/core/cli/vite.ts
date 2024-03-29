/* eslint-disable import/no-named-as-default-member */
import { UserConfig } from "./types";
import { createServer, build, PluginOption } from "vite";
import merge from "lodash/merge.js";
import putout, { operator } from "./putout";
import path from "path";
import type { RestackConfig } from "./types";
import types from "@babel/types";
import { convertToRoute } from "./restack";
import { RESTACK_SERVER_PKG_NAME, HTTP_METHODS } from "./consts";
import tsconfigPaths from "vite-tsconfig-paths";

export default async function vite(config: UserConfig) {
	config.vite.plugins = [
		...[tsconfigPaths(), viteReStackPlugin(config.restack)],
		...(config.vite.plugins as Array<any>),
	];

	if (!(config.build || config.preview)) {
		//development mode
		const devConfig = {
			build: { target: "es2020" },
			optimizeDeps: {
				esbuildOptions: {
					target: "es2020",
					supported: { bigint: true },
				},
			},
		};

		const server = await createServer(merge(devConfig, config.vite));

		await server.listen();
		server.printUrls();
	} else {
		//production build
		if (config.build) await build(config.vite);
	}
}

const viteReStackPlugin = (config: RestackConfig): PluginOption => {
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
					sourceFileName: id,
					sourceMapName: path.parse(id).name,
					plugins: [
						"typescript",
						[
							"replace-restack-server-plugin",
							replaceRestackServerPlugin(
								id.substring(routesAbsPath.length),
								config.apiPrefix
							),
						],
						"remove-unused-variables",
						"remove-useless-functions",
						"remove-unreachable-code",
					],
				});

				return {
					code : out.code,
					map : out.map
				};
			}
		},
	};
};

const replaceRestackServerPlugin = (relativeId: string,apiPrefix : string) => {
	const route = convertToRoute(relativeId);

	return {
		report: () => "Restack Vite Replace Plugin",
		fix: ({ path, removePath, replaceWith, replaceWithMultiple }) => {
			if (removePath) path.remove();

			if (replaceWith) operator.replaceWith(path, replaceWith);

			if (replaceWithMultiple)
				operator.replaceWithMultiple(path, replaceWithMultiple);
		},
		traverse: ({ push, store }) => ({
			ImportDeclaration(path) {
				handleImportDeclaration(push, path, store);
			},

			CallExpression(path) {
				handleReStackCall(apiPrefix,route, push, path, store);
			},
		}),
	};
};

function handleReStackCall(apiPrefix,route, push, path, store) {
	const callee = path.node.callee;

	const calleeName = callee.name || callee.object?.name;

	const restackCalls = store(RESTACK_SERVER_PKG_NAME);

	if (restackCalls) {
		const method = callee.property?.name.toUpperCase();

		if(!method)
			return;

		for (const sCaller of restackCalls) {
			if (calleeName === sCaller && HTTP_METHODS.includes(method)) {
				const nArguments = path.node.arguments;

				const params: types.StringLiteral[] = [];

				route.params.forEach((value) => {
					params.push(types.stringLiteral(value));
				});

				const defOpts = types.objectExpression([
					types.objectProperty(
						types.identifier("url"),
						types.stringLiteral(route.url)
					),
					types.objectProperty(
						types.identifier("params"),
						types.arrayExpression(params)
					),
					types.objectProperty(
						types.identifier("method"),
						types.stringLiteral(method)
					),
					types.objectProperty(
						types.identifier("apiPrefix"),
						types.stringLiteral(apiPrefix)
					)
				]);

				const replaceMember = types.memberExpression(
					types.identifier(calleeName),
					types.identifier("route")
				);

				let replaceWith;

				if (nArguments.length === 0) {
					throw new Error(
						`Route definition must have at least one handler argument`
					);
				} else if (nArguments.length === 1) {
					replaceWith = types.callExpression(replaceMember, [
						defOpts,
					]);
				} else {
					replaceWith = types.callExpression(replaceMember, [
						types.objectExpression([
							types.spreadElement(nArguments[0]),
							types.spreadElement(defOpts),
						]),
					]);
				}

				if (replaceWith)
					push({
						path,
						replaceWith,
					});
			} else if (calleeName === sCaller && method !== "ROUTE") {
					throw new Error(
						`Method ${method} not exist or not supported inside route files`
					);
			}
		}
	}
}

function handleImportDeclaration(push, path, store) {
	const pkg = path.node.source.value;

	if (pkg !== RESTACK_SERVER_PKG_NAME) return;

	const rNode = types.importDeclaration(
		path.node.specifiers,
		types.stringLiteral("@restack-run/client")
	);

	push({
		path: path,
		replaceWith: rNode,
	});

	if (!store(pkg)) store(pkg, []);

	for (const specifier of path.node.specifiers) {
		const importName = specifier.local.name;

		if (!store(pkg).includes(importName))
			store(pkg).push(specifier.local.name);
	}
}
