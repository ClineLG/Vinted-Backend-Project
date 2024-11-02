const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  //   console.log("coucou");
  if (!req.headers.authorization) {
    return res.status(404).json({ error: "Missing Token" });
  }

  const tokenTotest = req.headers.authorization.replace("Bearer ", "");
  //   console.log(tokenTotest);
  const isTokenToSomeOne = await User.findOne({ token: tokenTotest }).select(
    "account"
  );
  //   console.log(isTokenToSomeOne);
  if (!isTokenToSomeOne) {
    return res.status(400).json({ error: "Missing token" });
  }

  req.body.user = isTokenToSomeOne;
  next();
};

module.exports = isAuthenticated;
