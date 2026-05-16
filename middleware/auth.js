function auth(req, res, next){
    try {
        let errors = {};
        const {firstname, lastname, email, phonenumber, country, password1, password2 } = req.body;

        if(!firstname.trim() || !lastname.trim() || !email.trim() || !phonenumber.trim() || !country.trim()){
            errors.message = "Fill in the fields";
        }

        if(password1 !== password2){
            errors.message = "Passwords do not match";
        }

        // If errors exist
        if (Object.keys(errors).length > 0) {
            return res.status(400).json({
                success: false,
                errors: errors.message
            });
        }else{
            req.datas = {f: firstname, l: lastname, e: email, p: phonenumber, c: country, pwd: password1} ;
            req.session.user = {
                id: 1,
                email: email,
                username: firstname
            };
        }
    } catch (error) {
        console.log(error);
    }
    next();
}

function checksession(req, res, next){
    if(!req.session.user){
        return res.redirect("/")
    }
    next();
}

export default auth;
export { checksession };
