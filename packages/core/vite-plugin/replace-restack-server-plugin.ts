/* eslint-disable import/no-named-as-default-member */
import putout, { operator } from "putout";
import types from "@babel/types";
import { convertToRoute } from "../cli/restack";

const RESTACK_SERVER_PKG_NAME = "@restack-run/server";

const replaceRestackServer = (relativeId: string) => {
	const route = convertToRoute(relativeId);

	function getBasePath(path) {
		let cPath = path;
		for (;;) {
			if (cPath.parentPath.isProgram()) {
				return cPath;
			}

			cPath = cPath.parentPath;
		}
	}

	function handleReStackCall(push, path, listStore, store) {
		const callee = path.node.callee;

		const calleeName = callee.name || callee.object.name;

		const restackCalls = store(RESTACK_SERVER_PKG_NAME);

		if (restackCalls) {
			for (const sCaller of restackCalls) {
				if (
					calleeName === sCaller &&
					callee.property.name !== "route"
				) {
					const parent = path.parentPath;
					if (parent.isVariableDeclarator()) {
						listStore({ name: parent.node.id.name, route: true });
					}

					const nArguments = path.node.arguments;

					const params: types.StringLiteral[] = [];

					route.params.forEach((value) => {
						params.push(types.stringLiteral(value));
					});

					const defOpts = types.objectExpression([
						types.objectProperty(
							types.identifier("route"),
							types.stringLiteral(route.url)
						),
						types.objectProperty(
							types.identifier("params"),
							types.arrayExpression(params)
						),
						types.objectProperty(
							types.identifier("method"),
							types.stringLiteral(
								callee.property.name.toUpperCase()
							)
						),
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

	return {
		report: () => "Restack RemoveJSX Plugin",
		fix: ({ path, removePath, replaceWith, replaceWithMultiple }) => {
			if (removePath) path.remove();

			if (replaceWith) operator.replaceWith(path, replaceWith);

			if (replaceWithMultiple)
				operator.replaceWithMultiple(path, replaceWithMultiple);
		},
		traverse: ({ push, listStore, store }) => ({
			ImportDeclaration(path) {
				handleImportDeclaration(push, path, store);
			},

			CallExpression(path) {
				handleReStackCall(push, path, listStore, store);
			},

			Program: {
				enter: (path) => {
					//
				},
				exit: (path) => {
					//
				},
			},
		}),
	};
};

export default replaceRestackServer;
