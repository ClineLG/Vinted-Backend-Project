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
      const {
        title,
        description,
        price,
        condition,
        city,
        brand,
        size,
        color,
        user,
      } = req.body;
      if (!title || !price || title === "" || price === "" || !description) {
        return res.status(404).json({ error: "Missing parameters" });
      }

      if (description.length > 500) {
        return res
          .status(400)
          .json({ error: "Need a description less than 500 characters" });
      }
      if (title.length > 50) {
        return res
          .status(400)
          .json({ error: "Need a title less than 50 characters" });
      }
      if (price > 100000) {
        return res.status(400).json({ error: "Need a price less than 100000" });
      }
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
        owner: user,
      });
      if (req.files) {
        if (req.files.picture) {
          const convertedPicture = convertToBase64(req.files.picture);
          newOffer.product_image = await cloudinary.uploader.upload(
            convertedPicture,
            {
              folder: `Vinted/offers/${newOffer.id}`,
            }
          );
        }
        if (req.files.pictures) {
          const ArrayOfPix = req.files.pictures;

          const arrPromises = ArrayOfPix.map((picture) => {
            return cloudinary.uploader.upload(convertToBase64(picture), {
              folder: `Vinted/offers/${newOffer._id}`,
            });
          });
          newOffer.product_pictures = await Promise.all(arrPromises);
        }
      }
      await newOffer.save();
      offertosend = await Offer.findById(newOffer._id)
        .populate("owner", "account")
        .select("-product_pictures");

      res.status(201).json(offertosend);
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
      const { title, description, price, brand, size, condition, color, city } =
        req.body;

      if (!req.params.id || !isObjectIdOrHexString(req.params.id)) {
        return res.status(400).json({ error: "Missing parameters" });
      }

      const offerToUpdat = await Offer.findById(req.params.id);

      if (!offerToUpdat) {
        return res.status(404).json({ error: "No offer found" });
      }
      if (req.body.user._id.toString() !== offerToUpdat.owner.toString()) {
        return res
          .status(404)
          .json({ error: "Not allowed to update this offer" });
      }
      if (title) {
        offerToUpdat.product_name = req.body.title;
      }
      if (description) {
        offerToUpdat.product_description = req.body.description;
      }
      if (price) {
        offerToUpdat.product_price = req.body.price;
      }
      if (brand) {
        offerToUpdat.product_details[0].MARQUE = req.body.brand;
      }
      if (size) {
        offerToUpdat.product_details[1].TAILLE = req.body.size;
      }
      if (condition) {
        offerToUpdat.product_details[3].ETAT = req.body.condition;
      }
      if (color) {
        offerToUpdat.product_details[4].COULEUR = req.body.color;
      }
      if (city) {
        offerToUpdat.product_details[5].EMPLACEMENT = req.body.city;
      }

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
          const arrPromises = ArrayOfPix.map((picture) => {
            return cloudinary.uploader.upload(convertToBase64(picture), {
              folder: `Vinted/offers/${offerToUpdat._id}`,
            });
          });

          arrNewPixToUptade = await Promise.all(arrPromises);

          for (let j = 0; j < arrNewPixToUptade.length; j++) {
            offerToUpdat.product_pictures.push(arrNewPixToUptade[j]);
          }
        }
      }
      await offerToUpdat.save();

      const fullObj = await offerToUpdat.populate("owner", "account");

      res.status(201).json(fullObj);
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ error: error.message });
    }
  }
);

router.delete("/offer/delete/picture", isAuthenticated, async (req, res) => {
  try {
    if (
      !req.query.id ||
      !isObjectIdOrHexString(req.query.id) ||
      !req.query.secure_url
    ) {
      return res.status(400).json({ error: "missing parameters" });
    }

    const offerToDeletePix = await Offer.findById(req.query.id);

    if (!offerToDeletePix) {
      return res.status(404).json({ error: "Offer does not exist" });
    }
    if (req.body.user._id.toString() !== offerToDeletePix.owner.toString()) {
      return res
        .status(404)
        .json({ error: "Not allowed to delete this offer" });
    }
    let answer = false;

    if (offerToDeletePix.product_image.secure_url === req.query.secure_url) {
      const picturePrincipalToDelete = offerToDeletePix.product_image;
      await cloudinary.uploader.destroy(picturePrincipalToDelete.public_id);
      offerToDeletePix.product_image = {};
      answer = true;
    }
    const newArrofpix = [];

    for (let i = 0; i < offerToDeletePix.product_pictures.length; i++) {
      if (
        offerToDeletePix.product_pictures[i].secure_url === req.query.secure_url
      ) {
        const pictureToDelete = offerToDeletePix.product_pictures[i];
        await cloudinary.uploader.destroy(pictureToDelete.public_id);
        answer = true;
      } else {
        newArrofpix.push(offerToDeletePix.product_pictures[i]);
      }
    }

    if (answer === false) {
      return res
        .status(400)
        .json({ error: "wrong secure_url, no picture to delete" });
    }
    offerToDeletePix.product_pictures.slice(
      0,
      offerToDeletePix.product_pictures.length
    );
    offerToDeletePix.product_pictures = newArrofpix;
    await offerToDeletePix.save();
    res.status(201).json({ message: "Picture successfully deleted" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message });
  }
});

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

    if (offerToDelet.product_image || offerToDelet.product_pictures) {
      if (offerToDelet.product_image) {
        const folder = offerToDelet.product_image.asset_folder;

        const picturePrincipalToDelete = offerToDelet.product_image;
        await cloudinary.uploader.destroy(picturePrincipalToDelete.public_id);

        const picturesToDelete = offerToDelet.product_pictures;

        const arrPromises = picturesToDelete.map((picture) => {
          return cloudinary.uploader.destroy(picture.public_id);
        });

        await Promise.all(arrPromises);

        await cloudinary.api.delete_folder(folder);
      } else if (offerToDelet.product_pictures.length > 0) {
        const folder = offerToDelet.product_pictures[0].asset_folder;

        const picturePrincipalToDelete = offerToDelet.product_image;
        await cloudinary.uploader.destroy(picturePrincipalToDelete.public_id);

        const picturesToDelete = offerToDelet.product_pictures;

        const arrPromises = picturesToDelete.map((picture) => {
          return cloudinary.uploader.destroy(picture.public_id);
        });

        await Promise.all(arrPromises);
      }
    }

    const offerToDeletRealy = await Offer.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Offer successfully deleted !" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error });
  }
});

router.get("/offers", async (req, res) => {
  try {
    const { title, priceMin, priceMax, sort, page, limit } = req.query;
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
    let valeur = 0;
    if (limit) {
      if (page) {
        valeur = (page - 1) * limit;
      }
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
      .select("-product_pictures");

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
