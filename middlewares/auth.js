const jwt = require("jsonwebtoken")


module.exports = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.json({ "message": "Authorization missing" })
    }
    try {
        const token = authorization.split(" ")[1]
        const decode = jwt.verify(token, secretCode)
        req.user = decode.user
        next()
    } catch (err) {
        console.log(err)
        return res.json({ "message": "Token is invalid or expired" })
    }
}

