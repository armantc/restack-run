import pino,{transport} from "pino";

class Logger {
    _logger : pino.Logger;

    constructor()
    {
        const _transport = transport({
			target: "pino-pretty",
			options: {
				colorize: true,
				translateTime: "SYS:h:MM:ss.l TT",
				ignore: "hostname", //for local debug hostname not need to take space on log
			},
		});

        this._logger = pino({}, _transport);

        const errorHandler = (error, event) => {
			this._logger.info(`${event} caught`);

			if (error) {
				this._logger.error(error, "errors caused exit");
			}

			process.exit(error ? 1 : 0);

			// setTimeout(
			// 	function () {
			// 		process.exit(error ? 1 : 0);
			// 	},
			// 	process.env.NODE_ENV === "production" ? 40000 : 0
			// ); // 40 seconds needed maybe very slow network overhead and late response
		};

		process.on("beforeExit", () => errorHandler(null, "beforeExit"));
		process.on("exit", () => errorHandler(null, "exit"));
		process.on("uncaughtException", (err) =>
			errorHandler(err, "uncaughtException")
		);
		process.on("SIGINT", () => errorHandler(null, "SIGINT"));
		process.on("SIGQUIT", () => errorHandler(null, "SIGQUIT"));
		process.on("SIGTERM", () => errorHandler(null, "SIGTERM"));
    }

    get logger(){
        return this._logger;
    }
}

const logger = new Logger().logger;

export default logger;