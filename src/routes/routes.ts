import express from "express";

// Controllers (route handlers)
import { HomeController } from "../controllers/homeController";
import { UserController } from "../controllers/userController";

export class Routes{

    public homeController: HomeController = new HomeController();
    public userController: UserController = new UserController();

    public doRouting(app: express.Application): void{
        app.get("/", this.homeController.home);
        app.post("/login", this.userController.postLogin);
        app.get("/logout", this.userController.logout);
        app.get("/reset/:token", this.userController.getReset);
        app.post("/reset", this.userController.postReset);

        app.get("/account/signup", this.userController.getSignup);
        app.post("/account/signup", this.userController.postSignup);
        app.get("/account/forgot", this.userController.getForgot);
        app.post("/account/forgot", this.userController.postForgot);
    }
    
}
