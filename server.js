import express from "express";
import dotenv from "dotenv";
import crypto from "crypto";
import nodemailer from "nodemailer";
import session from "express-session";
import auth from "./middleware/auth.js";
import { checksession } from "./middleware/auth.js";
import db from "./models/database.js";
import logger from "./controlller/login.js";

const app = express();
dotenv.config();
app.use(express.json())
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }))

app.use(session({ /* session part */
    secret: process.env.secret,
    resave: false,
    saveUninitialized: false
}));

app.get("/", (req, res)=>{
    res.render("index");
})

app.post("/login", logger);

app.post("/register", auth, (req, res) =>{
    const {f, l, e, p, c, pwd} = req.datas;
    db.run(
        "INSERT INTO users (firstname, lastname, email, phoneno, country, password) VALUES (?, ?, ?, ?, ?, ?)", [f, l, e, p, c, pwd],
        function (err) {
            if (err) res.status(400).json({ success: false, errors: "Registration failed"});
        }
    );
    return res.status(200).json({success: true});
})

app.get("/dashboard", checksession, (req, res)=>{
    const user = req.session.user.username;
    res.render("dashboard", {username: user});
})

app.get("/recovery", async (req, res)=>{
    // const transporter = nodemailer.createTransport({
    // service: "gmail",
    // auth: {
    //     user: process.env.EMAIL_USER,
    //     pass: process.env.EMAIL_PASS
    //     }
    // });
    // const token = crypto.randomBytes(32).toString("hex");
    // await transporter.sendMail({
    //     from: process.env.EMAIL_USER,
    //     to: "uemmanuel911@gmail.com",
    //     subject: "Password Reset",
    //     html: `
    //         <h2>Password Reset</h2>
    //     `
    // });

    // res.json({
    //     message: "Password reset email sent"
    // });
})


app.listen(process.env.port, (req, res)=>{
    console.log(`site listening on http://127.0.0.1:${process.env.port}`)
})
