import async from "async";
import crypto from "crypto";
import nodemailer from "nodemailer";
import passport from "passport";
import { WriteError } from "mongodb";
import { User, UserDocument, AuthToken } from "../models/userModel";
import { Request, Response, NextFunction } from "express";
import { IVerifyOptions } from "passport-local";
import "../config/passport";

export class UserController{

    /**
     * POST /login
     * Sign in using email and password.
     */
    public postLogin = (req: Request, res: Response, next: NextFunction) => {
        const { email, password } = req.body;

        if (email == null || email == "") {
            req.flash("errors", "Introduzca un nombre de usuario");
            return res.redirect("/");
        }

        if (password == null || password == "") {
            req.flash("errors", "Introduzca una contraseña");
            return res.redirect("/");
        }

        passport.authenticate("local", (err: Error, user: UserDocument, info: IVerifyOptions) => {
            if (err) { return next(err); }
            if (!user) {
                req.flash("errors", info.message);
                return res.redirect("/");
            }
            req.logIn(user, (err) => {
                if (err) { return next(err); }
                res.redirect("/");
            });
        })(req, res, next);
    };

    /**
     * GET /logout
     * Log out.
     */
    public logout = (req: Request, res: Response) => {
        req.logout();
        res.redirect("/");
    };

    /**
     * GET /account/signup
     * Signup page.
     */
    public getSignup = (req: Request, res: Response) => {
        if (req.user) {
            return res.redirect("/");
        }
        res.render("account/signup", {
            title: "Create Account"
        });
    };

    /**
     * POST /account/signup
     * Create a new local account.
     */
    public postSignup = (req: Request, res: Response, next: NextFunction) => {
        const { email, password, confirmPassword, name, surname } = req.body;

        if (password.length < 4) {
            req.flash("errors", "Password must be at least 4 characters long");
            return res.redirect("/account/signup");
        }
        if(password !== confirmPassword) {
            req.flash("errors", "Passwords do not match");
            return res.redirect("/account/signup");
        }

        const user = new User({
            email: email,
            password: password,
            profile: {
                name: name,
                surname: surname
            }
        });

        User.findOne({ email: req.body.email }, (err, existingUser) => {
            if (err) { return next(err); }
            if (existingUser) {
                req.flash("errors", "Account with that email address already exists.");
                return res.redirect("/account/signup");
            }
            user.save((err) => {
                if (err) { return next(err); }
                req.logIn(user, (err) => {
                    if (err) {
                        return next(err);
                    }
                    res.redirect("/");
                });
            });
        });
    };

    /**
     * GET /account/forgot
     * Forgot Password page.
     */
    public getForgot = (req: Request, res: Response) => {
        if (req.isAuthenticated()) {
            return res.redirect("/");
        }
        res.render("account/forgot", {
            title: "Password Reset",
            reset: false
        });
    };

    /**
     * POST /account/forgot
     * Create a random token, then the send user an email with a reset link.
     */
    public postForgot = (req: Request, res: Response, next: NextFunction) => {
        const { email } = req.body; 

        async.waterfall([
            function createRandomToken(done: Function) {
                crypto.randomBytes(16, (err, buf) => {
                    const token = buf.toString("hex");
                    done(err, token);
                });
            },
            function setRandomToken(token: AuthToken, done: Function) {
                User.findOne({ email: email }, (err, user: any) => {
                    if (err) { return done(err); }
                    if (!user) {
                        req.flash("errors", "Account with that email address does not exist.");
                        return res.redirect("/account/forgot");
                    }
                    user.passwordResetToken = token;
                    user.passwordResetExpires = Date.now() + 600000; // 10 min
                    user.save((err: WriteError) => {
                        done(err, token, user);
                    });
                });
            },
            function sendForgotPasswordEmail(token: AuthToken, user: UserDocument, done: Function) {
                const transporter = nodemailer.createTransport({
                    service: "Gmail",
                    auth: {
                        user: process.env.SENDGRID_USER,
                        pass: process.env.SENDGRID_PASSWORD
                    }
                });
                const mailOptions = {
                    to: user.email,
                    from: "bisitetemplate@gmail.com",
                    subject: "Reset your password on BISITE Template",
                    text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n
                            Please click on the following link, or paste this into your browser to complete the process:\n\n
                            http://${req.headers.host}/reset/${token}\n\n
                            If you did not request this, please ignore this email and your password will remain unchanged.\n`
                };
                transporter.sendMail(mailOptions, (err) => {
                    req.flash("info", `An e-mail has been sent to ${user.email} with further instructions.`);
                    done(err);
                });
            }
        ], (err) => {
            if (err) { return next(err); }
            res.redirect("/account/forgot");
        });
    };

    /**
     * GET /reset/:token
     * Reset Password page.
     */
    public getReset = (req: Request, res: Response, next: NextFunction) => {
        if (req.isAuthenticated()) {
            return res.redirect("/");
        }
        User.findOne({ passwordResetToken: req.params.token })
            .where("passwordResetExpires").gt(Date.now())
            .exec((err, user: any) => {
                if (err) { return next(err); }
                if (!user) {
                    req.flash("errors", "Password reset token is invalid or has expired.");
                    return res.redirect("/account/forgot");
                }
                res.render("account/forgot", {
                    title: "Password Reset",
                    reset: true,
                    token: req.params.token
                });
            });
    };

    /**
     * POST /reset/:token
     * Process the reset password request.
     */
    public postReset = (req: Request, res: Response, next: NextFunction) => {
        const { password, confirmPassword, token } = req.body;

        if (password.length < 4) {
            req.flash("errors", "Password must be at least 4 characters long");
            return res.redirect("back");
        }
        if(password !== confirmPassword) {
            req.flash("errors", "Passwords do not match");
            return res.redirect("back");
        }

        async.waterfall([
            function resetPassword(done: Function) {
                User.findOne({ passwordResetToken: token })
                    .where("passwordResetExpires").gt(Date.now())
                    .exec((err, user: any) => {
                        if (err) { return next(err); }
                        if (!user) {
                            req.flash("errors", "Password reset token is invalid or has expired.");
                            return res.redirect("back");
                        }
                        user.password = password;
                        user.passwordResetToken = undefined;
                        user.passwordResetExpires = undefined;
                        user.save((err: WriteError) => {
                            if (err) { return next(err); }
                            req.logIn(user, (err) => {
                                done(err, user);
                            });
                        });
                    });
            },
            function sendResetPasswordEmail(user: UserDocument, done: Function) {
                const transporter = nodemailer.createTransport({
                    service: "Gmail",
                    auth: {
                        user: process.env.SENDGRID_USER,
                        pass: process.env.SENDGRID_PASSWORD
                    }
                });
                const mailOptions = {
                    to: user.email,
                    from: "bisitetemplate@gmail.com",
                    subject: "Your password has been changed",
                    text: `Hello,\n\nThis is a confirmation that the password for your account ${user.email} has just been changed.\n`
                };
                transporter.sendMail(mailOptions, (err) => {
                    req.flash("success", "Success! Your password has been changed.");
                    done(err);
                });
            }
        ], (err) => {
            if (err) { return next(err); }
            res.redirect("/");
        });
    };

}


