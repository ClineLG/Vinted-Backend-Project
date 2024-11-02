const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const fileUpload = require("express-fileupload");

require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI);

const userRoutes = require("./routes/user");

app.use("/user", userRoutes);

const offerRoutes = require("./routes/offer");

app.use(offerRoutes);

app.get("/", (req, res) => {
  res.status(201).json("Bienvenue sur Vinted !");
});

app.all("*", (req, res) => {
  res.status(404).json({ error: "all routes" });
});

app.listen(process.env.PORT, () => {
  console.log("serveur started 🎀");
});
