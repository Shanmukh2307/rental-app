import express from "express";
import { getTenant, createTenant, updateTenant } from "../controllers/tenantControllers";
const router = express.Router();

router.get("/:cognitoId", getTenant);
router.put("/:cognitoId" , updateTenant)
router.post("/", createTenant);

export default router;