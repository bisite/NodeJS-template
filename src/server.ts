import errorHandler from "errorhandler";

import app from "./app";

/**
 * Error Handler. Provides full stack - remove for production
 */
app.use(errorHandler());

/**
 * Start Express server.
 */
const server = app.listen(app.get("port"), () => {
    console.log(
        "\n\tApp is running at http://%s:%d in %s mode",
        app.get("host"),
        app.get("port"),
        app.get("env")
    );
    console.log("\tPress CTRL-C to stop\n");
});

export default server;
