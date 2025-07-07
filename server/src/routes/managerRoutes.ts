import express from "express";
import { getManager, createManager, updateManager, getManagerProperties } from "../controllers/managerControllers";

const router = express.Router();

router.get("/:cognitoId", getManager);
router.put("/:cognitoId", updateManager);
router.get("/:cognitoId/properties", getManagerProperties); // Assuming this is to get manager's properties
router.post("/", createManager);

export default router;