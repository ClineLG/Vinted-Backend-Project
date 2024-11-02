const express = require("express");
const isAuthenticated = require("../middleware/isAuthenticated");
const router = express.Router();
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});
const Offer = require("../models/Offer");
const fileUpload = require("express-fileupload");
const { isObjectIdOrHexString } = require("mongoose");

const convertToBase64 = require("../utils/convertToBase64");

router.post(
  "/offer/publish",
  isAuthenticated,
  fileUpload(),

  async (req, res) => {
    try {
      if (
        !req.body.title ||
        !req.body.price ||
        req.body.title === "" ||
        req.body.price === ""
      ) {
        return res.status(404).json({ error: "Missing parameters" });
      }

      if (req.body.description.length > 500) {
        return res
          .status(400)
          .json({ error: "Need a description less than 500 characters" });
      }
      if (req.body.title.length > 50) {
        return res
          .status(400)
          .json({ error: "Need a title less than 50 characters" });
      }
      if (req.body.price > 100000) {
        return res.status(400).json({ error: "Need a price less than 100000" });
      }

      const { title, description, price, condition, city, brand, size, color } =
        req.body;

      const newOffer = new Offer({
        product_name: title,
        product_description: description,
        product_price: price,
        product_details: [
          { MARQUE: brand },
          { TAILLE: size },
          { ETAT: condition },
          { COULEUR: color },
          { EMPLACEMENT: city },
        ],
        owner: req.body.user,
      });
      if (req.files) {
        // console.log(newOffer._id);
        if (req.files.picture) {
          const convertedPicture = convertToBase64(req.files.picture);
          newOffer.product_image = await cloudinary.uploader.upload(
            convertedPicture,
            {
              folder: `Vinted/user/${newOffer.id}`,
            }
          );
        }
        if (req.files.pictures) {
          const ArrayOfPix = req.files.pictures;
          console.log("coucou");
          for (let i = 0; i < ArrayOfPix.length; i++) {
            const picture = ArrayOfPix[i];
            newOffer.product_pictures.push(
              await cloudinary.uploader.upload(convertToBase64(picture), {
                folder: `Vinted/offers/${newOffer._id}`,
              })
            );
          }
        }
      }

      await newOffer.save();
      //à changer:
      const {
        _id,
        product_name,
        product_description,
        product_price,
        product_details,
        owner,
        product_image,
      } = newOffer;

      const ObjToSend = {
        _id: _id,
        product_name: product_name,
        product_description: product_description,
        product_price: product_price,
        product_details: product_details,
        owner: owner,
        product_image: product_image,
      };

      console.log(ObjToSend);
      res.status(201).json(ObjToSend);
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ error: error.message });
    }
  }
);

router.put(
  "/offer/update/:id",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    try {
      if (!req.params.id || !isObjectIdOrHexString(req.params.id)) {
        return res.status(400).json({ error: "Missing parameters" });
      }

      const offerToUpdat = await Offer.findById(req.params.id);

      if (!offerToUpdat) {
        return res.status(404).json({ error: "No offer found" });
      }
      //destructuring à faire:
      if (req.body.user._id.toString() !== offerToUpdat.owner.toString()) {
        return res
          .status(404)
          .json({ error: "Not allowed to update this offer" });
      }
      if (req.body.title) {
        offerToUpdat.product_name = req.body.title;
      }
      if (req.body.description) {
        offerToUpdat.product_description = req.body.description;
      }
      if (req.body.price) {
        offerToUpdat.product_price = req.body.price;
      }
      if (req.body.brand) {
        offerToUpdat.product_details[0].MARQUE = req.body.brand;
      }
      if (req.body.size) {
        offerToUpdat.product_details[1].TAILLE = req.body.size;
      }
      if (req.body.condition) {
        offerToUpdat.product_details[3].ETAT = req.body.condition;
      }
      if (req.body.color) {
        offerToUpdat.product_details[4].COULEUR = req.body.color;
      }
      if (req.body.city) {
        offerToUpdat.product_details[5].EMPLACEMENT = req.body.city;
      }
      // if (req.body.picturesToDelete) {
      //   console.log(req.body.picturesToDelete);
      //   let tabTest = req.body.picturesToDelete.split("-");
      //   console.log(tabTest);

      // !\\ pouvoir delete pictures

      // }

      if (req.files) {
        if (req.files.picture) {
          const convertedPicture = convertToBase64(req.files.picture);
          offerToUpdat.product_image = await cloudinary.uploader.upload(
            convertedPicture,
            {
              folder: `Vinted/user/${offerToUpdat.id}`,
            }
          );
        }
        if (req.files.pictures) {
          const ArrayOfPix = req.files.pictures;
          //à changer avec promise all
          for (let i = 0; i < ArrayOfPix.length; i++) {
            const picture = ArrayOfPix[i];
            offerToUpdat.product_pictures.push(
              await cloudinary.uploader.upload(convertToBase64(picture), {
                folder: `Vinted/offers/${offerToUpdat._id}`,
              })
            );
          }
        }
      }
      await offerToUpdat.save();

      const fullObj = await offerToUpdat.populate("owner", "account");

      //   console.log(ObjToSend);
      res.status(201).json(fullObj);
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ error: error.message });
    }
  }
);

router.delete("/offer/delete/:id", isAuthenticated, async (req, res) => {
  try {
    if (!req.params.id || !isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ error: "missing parameters" });
    }
    const offerToDelet = await Offer.findById(req.params.id);

    if (!offerToDelet) {
      return res.status(404).json({ error: "Offer does not exist" });
    }
    if (req.body.user._id.toString() !== offerToDelet.owner.toString()) {
      return res
        .status(404)
        .json({ error: "Not allowed to delete this offer" });
    }

    const picturesToDelete = offerToDelet.product_pictures;
    console.log(picturesToDelete);
    //changer avec promis.all
    for (let i = 0; i < picturesToDelete.length; i++) {
      await cloudinary.uploader.destroy(picturesToDelete[i].public_id);
    }
    const picturePrincipalToDelete = offerToDelet.product_image;
    const folder = picturePrincipalToDelete.asset_folder;
    console.log(folder);

    //faire delet folder...//!\\
    // await cloudinary.api.delete_folder(folder);

    const offerToDeletRealy = await Offer.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Offer successfully deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error });
  }
});

router.get("/offers", async (req, res) => {
  try {
    const { title, priceMin, priceMax, sort, page } = req.query;
    let filter = {};
    if (title) {
      filter.product_name = new RegExp(title, "i");
    }

    if (priceMin) {
      filter.product_price = { $gte: Number(priceMin) };
    }
    if (priceMax) {
      if (priceMin) {
        filter.product_price.$lte = Number(priceMax);
      } else {
        filter.product_price = { $lte: Number(priceMax) };
      }
    }
    const limit = 2;
    let valeur = 0;

    if (page) {
      valeur = (page - 1) * limit;
    }
    let sorted = {};
    if (sort === "price-desc") {
      sorted.product_price = -1;
    } else if (sort === "price-asc") {
      sorted.product_price = 1;
    }

    const offers = await Offer.find(filter)
      .populate("owner", "account")
      .sort(sorted)
      .skip(valeur)
      .limit(limit)
      .select("-product pictures");

    const counter = (await Offer.find(filter)).length;

    res.status(201).json({ count: counter, offers });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get("/offers/:id", async (req, res) => {
  try {
    const offerWant = await Offer.findById(req.params.id).populate(
      "owner",
      "account"
    );

    res.status(200).json(offerWant);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message });
  }
});
module.exports = router;
