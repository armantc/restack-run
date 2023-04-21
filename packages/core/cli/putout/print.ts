import generator from "@babel/generator";

export default function print(ast, options: any = {}) {
	//const { sourceMapName } = options;

	return babelPrint(ast, options);
}

function babelPrint(ast, options) {


	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	//@ts-ignore
	return generator.default(
		ast,
		{
			sourceMaps: true,
			sourceFileName: options.sourceFileName,
		},
		options.source
	);

	//return `${code}\n`;
}
