import express from "express";
import compression from "compression";  // compresses requests
import session from "express-session";
import bodyParser from "body-parser";
import lusca from "lusca";
import flash from "express-flash";
import path from "path";
import mongo from "connect-mongo";
import bluebird, { config } from "bluebird";
import mongoose from "mongoose";
import passport from "passport";

// API keys and Passport configuration
import * as passportConfig from "./config/passport";
import { Routes } from "./routes/routes";

import { MONGODB_URI, SESSION_SECRET } from "./utils/secrets";

class App{
    // Create Express server
    public app: express.Application;
    // Configure routes
    private routes: Routes = new Routes();
    // Connect to MongoDB
    private mongoUrl = MONGODB_URI;
    
    constructor(){
        this.app = express();
        this.mongoSetup();
        this.config();
        this.routes.doRouting(this.app); 
    }

    private mongoSetup(): void{
        mongoose.Promise = bluebird;

        mongoose.connect(this.mongoUrl, {
            useNewUrlParser: true,
            useCreateIndex: true,
            useUnifiedTopology: true
        })
        .then(() => {
            /** ready to use. The `mongoose.connect()` promise resolves to undefined. */
        })
        .catch(err => {
            console.log("MongoDB connection error. Please make sure MongoDB is running. " + err);
            process.exit();
        });
    }

    private config(): void{
        // MongoDB session store
        const MongoStore = mongo(session);

        // Express configuration
        this.app.set("host", process.env.SERVER_HOST || "localhost");
        this.app.set("port", process.env.SERVER_PORT || 3000);
        this.app.set("views", path.join(__dirname, "../views"));
        this.app.set("view engine", "ejs");
        
        this.app.use(compression());
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(session({
            resave: true,
            saveUninitialized: true,
            secret: SESSION_SECRET,
            store: new MongoStore({
                url: this.mongoUrl,
                autoReconnect: true
            }),
            cookie: { maxAge: 60000 } 
        }));
        this.app.use(passport.initialize());
        this.app.use(passport.session());
        this.app.use(flash());
        this.app.use(lusca.xframe("SAMEORIGIN"));
        this.app.use(lusca.xssProtection(true));
        this.app.use((req, res, next) => {
            res.locals.user = req.user;
            next();
        });
        this.app.use((req, res, next) => {
            // After successful login, redirect back to the intended page
            if (!req.user && req.path !== "/login" && req.path !== "/signup" &&
                !req.path.match(/^\/auth/) && !req.path.match(/\./)) {
                req.session.returnTo = req.path;
            } else if (req.user && req.path == "/account") {
                req.session.returnTo = req.path;
            }
            next();
        });
        this.app.use(
            // Configure Express to serve static files in the public folder
            express.static(path.join(__dirname, "public"), { maxAge: 31557600000 })
        );
    }
}

export default new App().app;
