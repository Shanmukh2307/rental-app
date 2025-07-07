import express from "express";
import { getProperties, getProperty, createProperty } from "../controllers/propertyControllers";
import { authMiddleware } from "../middleware/authMiddleware";
import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

router.get("/", getProperties);
router.put("/:id", getProperty);
router.post("/", 
    authMiddleware(["manager"]),
    upload.array("photos"),
    createProperty
);

export default router;