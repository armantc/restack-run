/* eslint-disable import/no-named-as-default */
import mime from "mime";
import fileSystem from "fs";
import path from "path";
import fastifyCompress from "@fastify/compress";
import fastifyStatic from "@fastify/static";
import { isDev } from "@restack-run/utils";

export default function (fastify, options, done) {

	options = options || {};
	if (typeof options.spa === "undefined") options.spa = true;

	if (typeof options.exclude === "undefined") options.exclude = [];

	if (isDev() && options.spa) {
		done();
		return;
	}

	// create a express.static middleware to handle serving files
	const compressions : any[] = [];
	const files = {};

	// read compressions from options
	setupCompressions();

	// if at least one compression has been added, lookup files
	if (compressions.length > 0) {
		findAllCompressionFiles(fileSystem, options.root);
	}

	fastify.register(fastifyCompress, {
		threshold: 0,
		encodings: ["br", "gzip", "deflate"], // this is for response not file compression
	});

	fastify.addHook("onRequest", middleware);

	fastify.register(fastifyStatic, {
		root: options.root,
	});

	done();

	function middleware(request, reply, done) {

		for (const exDir of options.exclude) {
			let path = exDir;
			if (exDir.charAt(0) !== "/") path = "/" + path;

			let url = request.raw.url;
			if (url.charAt(0) !== "/") url = "/" + url;

			if (url.toLowerCase().startsWith(path.toLowerCase())) return done();
		}

		changeUrlFromEmptyToIndexHtml(request);

		// get browser's' supported encodings
		const acceptEncoding = request.headers["accept-encoding"];

		// test if any compression is available
		const matchedFile = files[request.url];

		request.headers["x-no-compression"] = "true";

		// as long as there is any compression available for this
		// file, add the Vary Header (used for caching proxies)
		reply.header("Vary", "Accept-Encoding");

		if (matchedFile) {
			// use the first matching compression to serve a compresed file
			const compression = findAvailableCompressionForFile(
				matchedFile.compressions,
				acceptEncoding
			);

			if (compression) {
				convertToCompressedRequest(request, reply, compression);

				return reply.sendFile(
					path.basename(request.url),
					path.join(options.root, path.dirname(request.url))
				);
			}
		} else {
			let pathToFile = path.join(options.root, path.dirname(request.url));

			pathToFile = path.join(pathToFile, path.basename(request.url));

			if (fileSystem.existsSync(pathToFile)) {
				convertToCompressedRequest(request, reply, {
					fileExtension: "",
				});

				return reply.sendFile(
					path.basename(request.url),
					path.join(options.root, path.dirname(request.url))
				);
			}
		}

		reply.status(404).send("File not found");
	}

	/**
	 * Reads the options into a list of available compressions.
	 */
	function setupCompressions() {
		// register all provided compressions
		if (
			options.customCompressions &&
			options.customCompressions.length > 0
		) {
			for (let i = 0; i < options.customCompressions.length; i += 1) {
				const customCompression = options.customCompressions[i];
				registerCompression(
					customCompression.encodingName,
					customCompression.fileExtension
				);
			}
		}

		registerCompression("br", "br");
		// gzip compression is enabled by default
		registerCompression("gzip", "gz");
	}

	/**
	 * Changes the url and adds required headers to serve a compressed file.
	 *
	 * @param {object} request
	 * @param {object} reply
	 * @param {object} compression
	 */
	function convertToCompressedRequest(request, reply, compression) {
		const type = mime.getType(request.url);
		const charset = mime.getExtension(type);
		let search = request.url.split("?").splice(1).join("?");

		if (search !== "") {
			search = `?${search}`;
		}

		request.raw.url = request.url + compression.fileExtension + search;
		reply.header("Content-Encoding", compression.encodingName);
		reply.header(
			"Content-Type",
			type + (charset ? `; charset=${charset}` : "")
		);
	}

	/**
	 * In case it's enabled in the options and the
	 * requested url does not request a specific file, "index.html" will be appended.
	 *
	 * @param {object} request
	 */
	function changeUrlFromEmptyToIndexHtml(request) {
		const ext = path.extname(request.url);

		if (options.spa && !ext) {
			request.raw.url = "/index.html";
		}
	}

	/**
	 * Searches for the first matching compression available from the given compressions.
	 *
	 * @param {[any]} compressionList
	 * @param {string} acceptedEncoding
	 * @returns {any}
	 */
	function findAvailableCompressionForFile(
		compressionList,
		acceptedEncoding
	) {
		if (acceptedEncoding) {
			for (let i = 0; i < compressionList.length; i += 1) {
				if (
					acceptedEncoding.indexOf(compressionList[i].encodingName) >=
					0
				) {
					return compressionList[i];
				}
			}
		}
		return null;
	}

	function findAllCompressionFiles(fs, folderPath) {
		const filesMain = fs.readdirSync(folderPath);
		// iterate all files in the current folder
		for (let i = 0; i < filesMain.length; i += 1) {
			const filePath = `${folderPath}/${filesMain[i]}`;
			const stats = fs.statSync(filePath);
			if (stats.isDirectory()) {
				// recursively search folders and append the matching files
				findAllCompressionFiles(fs, filePath);
			} else {
				addAllMatchingCompressionsToFile(filesMain[i], filePath);
			}
		}
	}

	function addAllMatchingCompressionsToFile(fileName, fullFilePath) {
		for (let i = 0; i < compressions.length; i += 1) {
			if (fileName.endsWith(compressions[i].fileExtension)) {
				addCompressionToFile(fullFilePath, compressions[i]);
				return;
			}
		}
	}

	function addCompressionToFile(filePath, compression) {
		const srcFilePath = filePath
			.replace(compression.fileExtension, "")
			.replace(options.root, "");
		const existingFile = files[srcFilePath];
		if (!existingFile) {
			files[srcFilePath] = { compressions: [compression] };
		} else {
			existingFile.compressions.push(compression);
		}
	}

	function registerCompression(encodingName, fileExtension) {
		if (!findCompressionByName(encodingName)) {
			compressions.push(new Compression(encodingName, fileExtension));
		}
	}

	function Compression(encodingName, fileExtension) {
		this.encodingName = encodingName;
		this.fileExtension = `.${fileExtension}`;
	}

	function findCompressionByName(encodingName) {
		for (let i = 0; i < compressions.length; i += 1) {
			if (compressions[i].encodingName === encodingName) {
				return compressions[i];
			}
		}
		return null;
	}
}
