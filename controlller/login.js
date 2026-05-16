import db from "../models/database.js";

export default function logger(req, res){
    const {email, password} = req.body;
    db.get(
        "SELECT * FROM users WHERE email = ?",
        [email],
        (err, user) => {
            // user not found
            if (!user) {
                return res.render("index", {error: "Account does not exist"});
            }
            // password check
            if (user.password !== password) {
                return res.render("index", { error: "Incorrect password" });
            }else{
                req.session.user = {
                    id: user.id,
                    email: user.email,
                    username: user.firstname
                };
                res.redirect("/dashboard");
            }
        }
    );
}