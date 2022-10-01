/* eslint-disable import/no-named-as-default-member */
import { operator } from "putout";
import types from "@babel/types";
import { convertToRoute } from "../cli/restack";
import { RESTACK_SERVER_PKG_NAME, HTTP_METHODS } from "../cli/consts";

const replaceRestackServer = (relativeId: string) => {
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
				handleReStackCall(route,push, path, store);
			},
		}),
	};
};

function handleReStackCall(route,push, path, store) {
	const callee = path.node.callee;

	const calleeName = callee.name || callee.object.name;

	const restackCalls = store(RESTACK_SERVER_PKG_NAME);

	if (restackCalls) {
		for (const sCaller of restackCalls) {
			if (
				calleeName === sCaller &&
				HTTP_METHODS.includes(callee.property.name.toUpperCase())
			) {
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
						types.stringLiteral(callee.property.name.toUpperCase())
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

export default replaceRestackServer;
