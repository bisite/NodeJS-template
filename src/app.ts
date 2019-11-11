import express from "express";
import compression from "compression";  // compresses requests
import session from "express-session";
import bodyParser from "body-parser";
import lusca from "lusca";
import flash from "express-flash";
import path from "path";
import mongo from "connect-mongo";
import bluebird from "bluebird";
import mongoose from "mongoose";
import passport from "passport";

import { MONGODB_URI, SESSION_SECRET } from "./utils/secrets";

// MongoDB session store
const MongoStore = mongo(session);

// Controllers (route handlers)
import * as homeController from "./controllers/home";
import * as userController from "./controllers/user";

// API keys and Passport configuration
import * as passportConfig from "./config/passport";

// Connect to MongoDB
const mongoUrl = MONGODB_URI;
mongoose.Promise = bluebird;

mongoose.connect(mongoUrl, {
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

// Create Express server
const app = express();

// Express configuration
app.set("host", process.env.SERVER_HOST || "localhost");
app.set("port", process.env.SERVER_PORT || 3000);
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "ejs");
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: SESSION_SECRET,
    store: new MongoStore({
        url: mongoUrl,
        autoReconnect: true
    }),
    cookie: { maxAge: 60000 } 
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(lusca.xframe("SAMEORIGIN"));
app.use(lusca.xssProtection(true));
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});
app.use((req, res, next) => {
    // After successful login, redirect back to the intended page
    if (!req.user && req.path !== "/login" && req.path !== "/signup" &&
        !req.path.match(/^\/auth/) && !req.path.match(/\./)) {
        req.session.returnTo = req.path;
    } else if (req.user && req.path == "/account") {
        req.session.returnTo = req.path;
    }
    next();
});

app.use(
    // Configure Express to serve static files in the public folder
    express.static(path.join(__dirname, "public"), { maxAge: 31557600000 })
);

/**
 * Primary app routes.
 */
app.get("/", homeController.home);
app.get("/account/signup", userController.getSignup);
app.post("/account/signup", userController.postSignup);
app.get("/account/forgot", userController.getForgot);
app.post("/account/forgot", userController.postForgot);
app.post("/login", userController.postLogin);
app.get("/logout", userController.logout);
app.get("/reset/:token", userController.getReset);
app.post("/reset", userController.postReset);

export default app;
