const express = require("express");

const router = express.Router();

const User = require("../models/User");

const uid2 = require("uid2");

const SHA256 = require("crypto-js/sha256");

const encBase64 = require("crypto-js/enc-base64");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});
const convertToBase64 = require("../utils/convertToBase64");

const fileUpload = require("express-fileupload");

router.post("/signup", fileUpload(), async (req, res) => {
  try {
    console.log(req.body);

    if (!req.body.email || !req.body.password) {
      return res.status(404).json({ error: "Parameters missing" });
    }
    if (!req.body.username || req.body.username === "") {
      return res.status(404).json({ error: "Username needed" });
    }
    const isEmailExist = await User.findOne({ email: req.body.email });
    if (isEmailExist) {
      return res.status(404).json({ error: "email allready used" });
    }

    // console.log(req.body.password);
    password = req.body.password;
    const salt = uid2(16);
    const hash = SHA256(password + salt).toString(encBase64);
    const token = uid2(32);
    const newObjToSend = {};
    const newUser = new User({
      email: req.body.email,
      account: {
        username: req.body.username,

        avatar: {},
      },
      newsletter: req.body.newsletter,
      token: token,
      hash: hash,
      salt: salt,
    });
    await newUser.save();
    // filteredUser = await User.findById(newUser.id).select("   account  token ");
    // console.log(filteredUser);
    if (req.files) {
      const convertedPicture = convertToBase64(req.files.picture);
      const objPicture = await cloudinary.uploader.upload(convertedPicture, {
        folder: `Vinted/user/${newUser.id}`,
      });

      newUser.account.avatar = { secure_url: objPicture.secure_url };

      await newUser.save();
    }

    newObjToSend["_id"] = newUser["_id"];
    newObjToSend["token"] = newUser["token"];
    newObjToSend["account"] = newUser["account"];

    // console.log(newObjToSend);
    res.status(201).json(newObjToSend);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const userEmail = req.body.email;
    const userPassword = req.body.password;

    if (!userPassword && !userEmail) {
      return res.status(404).json({ error: "details needed" });
    }

    if (!userPassword) {
      return res.status(404).json({ error: "Password needed" });
    }
    if (!userEmail) {
      return res.status(404).json({ error: "Email address needed" });
    }

    const userDetails = await User.findOne({ email: userEmail });

    if (!userDetails) {
      return res.status(404).json({ error: "Email address unknown" });
    }

    console.log(userDetails);
    const saltUser = userDetails.salt;
    const tokenUser = userDetails.token;
    const hashUser = userDetails.hash;

    const tryHashUser = SHA256(userPassword + saltUser).toString(encBase64);

    if (tryHashUser !== hashUser) {
      return res.status(404).json({ error: "Wrong password" });
    }
    const newObjToSend = {};
    newObjToSend["_id"] = userDetails["_id"];
    newObjToSend["token"] = userDetails["token"];
    newObjToSend["account"] = userDetails["account"];

    res.status(201).json(newObjToSend);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
