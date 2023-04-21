import traverse from "@babel/traverse";
import types from "@babel/types";
import loader from "@putout/engine-loader";
import runner from "@putout/engine-runner";
import { parse } from "@putout/engine-parser";
import print from "./print";
import * as operate from "@putout/operate";
import cutShebang from "./cut-shebang";

const isString = (a) => typeof a === "string";

const defaultOpts = (opts : any = {}) => {
	const {
		parser = "babel",
		fix = true,
		fixCount = 2,
		loadPlugins = loader.loadPlugins,
		runPlugins = runner.runPlugins,
	} = opts;

	return {
		...opts,
		parser,
		fix,
		fixCount,
		loadPlugins,
		runPlugins,
	};
};

export default function putout (source, opts) {
	check(source);
	opts = defaultOpts(opts);

	const {
		parser,
		isTS,
		isFlow,
		isJSX,
		sourceFileName,
		sourceMapName
	} = opts;

	const [clearSource, shebang] = cutShebang(source);
	const ast = parse(clearSource, {
		sourceFileName,
		parser,
		isTS,
		isFlow,
		isJSX
	});

	const places = transform(ast, source, opts);

	if (!opts.fix)
		return {
			code: source,
			places,
		};

	const printed = print(ast, {
		sourceMapName,
		sourceFileName,
		source,
	});
	const code = `${shebang}${printed.code}`;

	return {
		code,
		map : printed.map,
		places,
	};
}

function findPlaces (ast, source, opts) {
	return transform(ast, source, {
		...opts,
		fix: false,
	});
}

// why we pass 'source' to 'transform()'?
// because we need to calculate position in a right way
// and determine is shebang is exists
//
// 25     return {¬
// 26         line: shebang ? line + 1 : line,¬
// 27         column,¬
// 28     };¬
//
function transform(ast, source, opts) {
	opts = defaultOpts(opts);

	const {
		plugins: pluginNames,
		cache,
		rules,
		fix,
		fixCount,
		loadPlugins,
		runPlugins,
	} = opts;

	const [, shebang] = cutShebang(source);
	const plugins = loadPlugins({
		pluginNames,
		cache,
		rules,
	});

	const places = runPlugins({
		ast,
		shebang,
		fix,
		fixCount,
		plugins,
	});

	return places;
}

function check(source) {
	if (!isString(source))
		throw Error(
			`☝️ Looks like 'source' has type '${typeof source}', expected: 'string'`
		);
}

const operator = {...operate};

export {types,transform,traverse , operator , findPlaces}