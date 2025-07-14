import express from "express";
import { getProperties, getProperty, getPropertyLeases, createProperty } from "../controllers/propertyControllers";
import { authMiddleware } from "../middleware/authMiddleware";
import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

router.get("/", getProperties);
router.get("/:id", getProperty);
router.get("/:id/leases", getPropertyLeases);
router.post("/", 
    authMiddleware(["manager"]),
    upload.array("photos"),
    createProperty
);

export default router;