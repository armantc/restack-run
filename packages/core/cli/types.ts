import type { UserConfig as ViteUserConfig } from "vite";

export type RestackConfig = {
    /**
     * relative path define all app routes
     */
	routesDir: string;
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
    /**
     * module names marked as external, see esbuild documents
     */
    external? : [];
};

export type UserConfig = {
    outDir : string;
    cacheDir : string;
    restack : RestackConfig;
    vite : ViteUserConfig;
	build?: boolean;
	preview?: boolean;
	independent?: boolean;
};

export type UserConfigExport = Omit<Partial<UserConfig>, "build" | "preview" | "independent">