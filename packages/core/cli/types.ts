import type { UserConfigExport } from "vite";

type RestackConfig = {
    /**
     * relative path restack use for generate temp cache files
     */
	cacheDir: string;
    /**
     * relative path define all app routes
     */
	routesDir: string;
    /**
     * relative directory path restack write build files
     */
	outDir: string;
    /**
     * file name use for generated bundle file in outDir
     */
	outFile: string;
    /**
     * prepend to each api path in restack server
     * 
     * @default /api
     */
    apiPrefix : string;
    /**
     * define server entry file path
     */
    serverEntryPath? : string;
    /**
     * port server listening on
     */
    port? : number;
};

export type UserConfig = {
    vite : UserConfigExport,
    restack : RestackConfig,
    build? : boolean,
    preview? : boolean,
    independent? : boolean
}

export type ExportUserConfig = {
	vite?: UserConfigExport;
	restack?: RestackConfig;
};