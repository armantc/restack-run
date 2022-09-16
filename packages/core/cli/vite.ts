import { UserConfig } from './types';
import { createServer ,build  } from "vite";
import merge from "lodash/merge.js";

export default async function vite( config : UserConfig ){

	if(!(config.build || config.preview)) //development mode 
	{

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
	}else{
		//production build
		if(config.build)
			await build(config.vite);
	}
}