import { Request, Response } from "express";

export class HomeController{

    /**
     * GET /
     * Home page.
     */
    public home = (req: Request, res: Response) => {
        if (req.user) {
            res.render("index", {
                user: req.user
            });
        }else{
            res.render("home", {
                title: "Home"
            });
        }
    };

}

