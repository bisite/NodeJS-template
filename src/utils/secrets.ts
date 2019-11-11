import logger from "./logger";
import dotenv from "dotenv";
import fs from "fs";

if (fs.existsSync(".env")) {
    logger.debug("Using .env file to supply config environment variables");
    dotenv.config({ path: ".env" });
} else {
    logger.error("No .env file detected. Create an .env file to supply config environment variables");
    process.exit(1);
}

export const ENVIRONMENT = process.env.NODE_ENV;
export const SESSION_SECRET = process.env.SESSION_SECRET;
export const MONGODB_URI = process.env.MONGODB_URI;

if (!SESSION_SECRET) {
    logger.error("No client secret. Set SESSION_SECRET environment variable.");
    process.exit(1);
}

if (!MONGODB_URI) {
    logger.error("No mongo connection string. Set MONGODB_URI environment variable.");
    process.exit(1);
}