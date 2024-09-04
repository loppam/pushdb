const express = require("express");
const { ObjectId } = require("mongodb");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const { connectToDb, getDb } = require("./db");

// Initialize environment variables
dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });
app.use(express.json());
app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Configure CORS
const corsOptions = {
  origin: ['https://ololade-sule.wl.r.appspot.com', 'http://localhost:3000'], // Your frontend's origin
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// DB connection
let db;

const startServer = async () => {
  try {
    const MONGO_URL = process.env.MONGO_URL;
    const PORT = process.env.PORT || 3000;
    const BASE_URL =
      process.env.BASE_URL || "https://ololade-sule.wl.r.appspot.com/uploads";

    // Connect to MongoDB using mongoose
    await mongoose.connect(MONGO_URL);
    console.log("Database connected successfully");

    // Connect to MongoDB using MongoClient
    await new Promise((resolve, reject) => {
      connectToDb((err) => {
        if (err) {
          reject(err);
        } else {
          db = getDb();
          resolve();
        }
      });
    });

    // Start the server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
};

// Call the function to start the server
startServer();

// Routes ...

// Create art image and link it to art details
app.post("/art/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const artId = req.body.artId;

  if (!ObjectId.isValid(artId)) {
    return res.status(400).json({ error: "Invalid art ID format" });
  }

  const imagePath = req.file.path;
  const imageMetadata = {
    filename: req.file.filename,
    size: req.file.size,
    path: imagePath,
    uploadDate: new Date(),
    artId: new ObjectId(artId),
  };

  db.collection("images")
    .insertOne(imageMetadata)
    .then((result) => {
      return db
        .collection("art")
        .updateOne(
          { _id: new ObjectId(artId) },
          { $set: { imageId: result.insertedId } }
        );
    })
    .then((result) => {
      res.status(201).json({
        message: "Uploaded and linked successfully",
        imageMetadata: imageMetadata,
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: "Could not upload the image metadata to the database",
      });
    });
});

// Get all art details including image metadata
app.get("/art", (req, res) => {
  const BASE_URL =
    process.env.BASE_URL || "https://ololade-sule.wl.r.appspot.com/uploads";

  db.collection("art")
    .aggregate([
      {
        $lookup: {
          from: "images",
          localField: "imageId",
          foreignField: "_id",
          as: "image",
        },
      },
      {
        $addFields: {
          "image.url": {
            $concat: [BASE_URL, "/", { $arrayElemAt: ["$image.filename", 0] }],
          },
        },
      },
    ])
    .toArray()
    .then((art) => {
      res.status(200).json(art);
    })
    .catch(() => {
      res.status(500).json({ error: "Could not fetch the documents" });
    });
});

// Get a specific art ID including image metadata
app.get("/art/:id", (req, res) => {
  const BASE_URL =
    process.env.BASE_URL || "https://ololade-sule.wl.r.appspot.com/uploads";

  let id;
  try {
    id = new ObjectId(req.params.id);
  } catch (err) {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  db.collection("art")
    .aggregate([
      { $match: { _id: id } },
      {
        $lookup: {
          from: "images",
          localField: "imageId",
          foreignField: "_id",
          as: "image",
        },
      },
      {
        $addFields: {
          "image.url": {
            $concat: [BASE_URL, "/", { $arrayElemAt: ["$image.filename", 0] }],
          },
        },
      },
    ])
    .toArray()
    .then((art) => {
      if (art.length === 0) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.status(200).json(art[0]);
    })
    .catch(() => {
      res.status(500).json({ error: "Could not fetch the document" });
    });
});

// Create an art detail
app.post("/art", (req, res) => {
  const art = req.body;
  db.collection("art")
    .insertOne(art)
    .then((result) => {
      res.status(201).json(result);
    })
    .catch(() => {
      res.status(500).json({ error: "Could not create a new document" });
    });
});

// Delete an art detail
app.delete("/art/:id", (req, res) => {
  let id;
  try {
    id = new ObjectId(req.params.id);
  } catch (err) {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  db.collection("art")
    .deleteOne({ _id: id })
    .then((result) => {
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "Document not found" });
      }
      return db.collection("images").deleteOne({ artId: id });
    })
    .then(() => {
      res.status(200).json({ message: "Document deleted" });
    })
    .catch(() => {
      res.status(500).json({ error: "Could not delete the document" });
    });
});

// Update an art detail
app.patch("/art/:id", (req, res) => {
  let id;
  try {
    id = new ObjectId(req.params.id);
  } catch (err) {
    return res.status(400).json({ error: "Invalid ID format" });
  }
  const updates = req.body;

  db.collection("art")
    .updateOne({ _id: id }, { $set: updates })
    .then((result) => {
      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.status(200).json(result);
    })
    .catch(() => {
      res.status(500).json({ error: "Could not update the document" });
    });
});

module.exports = app;