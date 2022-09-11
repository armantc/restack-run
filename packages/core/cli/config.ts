import {
	createServer,
	build,
	defineConfig,
	PluginOption,
	InlineConfig,
	loadConfigFromFile,
} from "vite";

export default async function config() {
    const config = await loadConfigFromFile(
        {
            command : "build",
            mode : "development"
        }
    );

    console.log(config);
}
