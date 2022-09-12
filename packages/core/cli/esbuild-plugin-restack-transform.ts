import { UserConfig } from "./types";
import esbuild from "esbuild";
import putout, { types, operator } from "putout";
import convert from "convert-source-map";
import path from "path";
import { nanoid } from "nanoid";
import fs from "fs-extra";

const restackTransform = {
	report: () => "Restack RemoveJSX Plugin",
	fix: ({ path, removePath, replaceWith, replaceWithMultiple }) => {
		if (removePath) path.remove();

		if (replaceWith) operator.replaceWith(path, replaceWith);

		if (replaceWithMultiple)
			operator.replaceWithMultiple(path, replaceWithMultiple);
	},
	traverse: ({ push, listStore, store }) => ({
		ImportDeclaration(path) {
			handleImportDeclaration(path, store);
		},
		JSXElement(path) {
			handleJSXElement(push, path, listStore);
		},

		CallExpression(path) {
			handleReStackCall(push, path, listStore, store);
		},

		ExportSpecifier(path) {
			handleExport(push, path, listStore);
		},

		ExportDefaultDeclaration(path) {
			handleExport(push, path, listStore);
		},

		Program: {
			enter: (path) => {
				const defaultExport = operator.getExportDefault(path);

				if (!defaultExport)
					path.node.body.push(
						types.ExportDefaultDeclaration(
							types.ObjectExpression([])
						)
					);
			},
			exit: (path) => {
				const defaultExport = operator.getExportDefault(path);

				if (!defaultExport) {
					const exp = generateDefaultExport(listStore);
					if (exp)
						path.node.body.push(generateDefaultExport(listStore));
				}
			},
		},
	}),
};

function generateDefaultExport(listStore) {
	const properties = [];

	if (listStore().length > 0) {
		for (const { name, route } of listStore()) {
			if (route) {
				properties.push(
					types.ObjectProperty(
						types.Identifier(name),
						types.Identifier(name),
						false,
						true //create shorthand
					) as never
				);
			}
		}
	}

	if (properties.length > 0) {
		return types.ExportDefaultDeclaration(
			types.ObjectExpression(properties)
		);
	}

	return null;
}

function getBasePath(path) {
	let cPath = path;
	for (;;) {
		if (cPath.parentPath.isProgram()) {
			return cPath;
		}

		cPath = cPath.parentPath;
	}
}

function handleExport(push, path, listStore) {
	if (path.isExportDefaultDeclaration()) {
		if (
			path.node?.declaration.name ||
			(path.node?.declaration.properties &&
				path.node?.declaration.properties.length === 0)
		) {
			//expression statement default export
			push({ path, replaceWith: generateDefaultExport(listStore) });
		} else if (
			path.node?.declaration.id?.name ||
			path.node?.declaration.callee?.name
		) {
			// declaration default export
			if (path.node?.declaration.type === "FunctionDeclaration") {
				push({
					path: path,
					replaceWithMultiple: [
						types.ExportNamedDeclaration(path.node.declaration),
						generateDefaultExport(listStore),
					],
				});
			} else {
				push({
					path: path,
					replaceWithMultiple: [
						types.ExportNamedDeclaration(
							types.VariableDeclaration("const", [
								types.VariableDeclarator(
									types.Identifier(`restack${nanoid(3)}`),
									path.node.declaration
								),
							])
						),
						generateDefaultExport(listStore),
					],
				});
			}
		}
	}

	if (listStore().length > 0) {
		let exportLocalName;

		if (path.isExportSpecifier()) {
			exportLocalName = path.node?.local.name;
		} else if (path.isExportDefaultDeclaration()) {
			exportLocalName =
				path.node?.declaration.name || path.node?.declaration.id?.name;
		}

		if (exportLocalName) {
			for (const { name, removeExport } of listStore()) {
				if (name === exportLocalName && removeExport) {
					push({ path, removePath: true });
				}
			}
		}
	}
}

function handleJSXElement(push, path, listStore) {
	const basePath = getBasePath(path);

	if (
		basePath.isExportNamedDeclaration() ||
		basePath.isExportDefaultDeclaration() ||
		basePath.isExpressionStatement()
	) {
		push({ path: basePath, removePath: true });
	} else {
		let name;

		if (basePath.isVariableDeclaration()) {
			name = basePath.node.declarations[0].id.name;
		} else if (basePath.isFunctionDeclaration()) {
			name = basePath.node.id.name;
		}

		if (name) {
			listStore({ name, removeExport: true });
			push({ path: basePath, removePath: true });
		}
	}
}

function handleReStackCall(push, path, listStore, store) {
	const callee = path.node.callee;

	const calleeName = callee.name || callee.object.name;

	const restackCalls = store("@restack-run/server");

	if (restackCalls) {
		for (const sCaller of restackCalls) {
			if (calleeName === sCaller) {
				const parent = path.parentPath;
				if (parent.isVariableDeclarator()) {
					listStore({ name: parent.node.id.name, route: true });
				}
			}
		}
	}
}

function handleImportDeclaration(path, store) {
	const pkg = path.node.source.value;

	if (!store(pkg)) store(pkg, []);

	for (const specifier of path.node.specifiers) {
		const importName = specifier.local.name;

		if (!store(pkg).includes(importName))
			store(pkg).push(specifier.local.name);
	}
}

function transform({ id, source }) {
	const plugins: any[] = [
		["restack-transform", restackTransform],
		"remove-useless-functions",
		"remove-unreachable-code",
		"remove-empty",
		"remove-unreferenced-variables",
		"remove-unused-expressions",
		// "remove-unused-variables", //todo must handle this but prevent not to remove server codes
	];

	const isTS = id.endsWith(".ts") || id.endsWith(".tsx");

	const out = putout(source, {
		fix: true,
		isJSX: id.endsWith(".tsx") || id.endsWith(".jsx"),
		isTS,
		sourceFileName: path.basename(id),
		sourceMapName: path.parse(id).name,
		plugins,
	});

	//console.log(out.code);

	// const _convert = convert.fromSource(out.code);

	// _convert.sourcemap.sourcesContent = null;

	//return { code: convert.removeComments(out.code), map: _convert.sourcemap };
	return out.code;
}

const PluginRestackTransform = (config: UserConfig): esbuild.Plugin => ({
	name: "RestackTransform",
	setup(build) {
		build.onLoad({ filter: /.*\.(tsx|jsx|ts|js)$/ }, async (args) => {

			const routesAbsPath = path.join(process.cwd(),config.restack.routesDir);

			//just transform routes
			//todo maybe need exclude importers too
			if (!args.path.startsWith(routesAbsPath)) {
				return {}
			}

			const source = await fs.readFile(args.path, {
				encoding: "utf-8",
			});

			const out = transform({ id: args.path, source: source });

			let loader = "js";

			if (args.path.endsWith("tsx")) loader = "tsx";
			if (args.path.endsWith("jsx")) loader = "jsx";
			if (args.path.endsWith("ts")) loader = "ts";

			return {
				contents: out,
				loader: loader,
			} as esbuild.OnLoadResult;
		});
	},
});

export default PluginRestackTransform;
