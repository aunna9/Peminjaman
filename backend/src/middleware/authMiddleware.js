const jwt = require("jsonwebtoken");

const secretKey = "ayosekolah";

const authJWT = (req, res, next) => {
  // Express standar: header selalu lowercase
  const authHeader = req.headers.authorization || "";

  // format wajib: "Bearer <token>"
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized (no bearer)" });
  }

  const token = authHeader.slice(7);

  try {
    const user = jwt.verify(token, secretKey);
    // user = { id, role, iat, exp }
    req.user = user;
    return next();
  } catch (err) {
    console.log("JWT VERIFY ERROR:", err.message);
    return res.status(403).json({ message: "Forbidden" });
  }
};

module.exports = authJWT;
