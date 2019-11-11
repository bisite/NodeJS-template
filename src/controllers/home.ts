import { Request, Response } from "express";

/**
 * GET /
 * Home page.
 */
export const home = (req: Request, res: Response) => {
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
