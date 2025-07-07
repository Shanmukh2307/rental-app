import express from "express";
import { getTenant, createTenant, updateTenant, getCurrentResidences, addFavoriteProperty, removeFavoriteProperty } from "../controllers/tenantControllers";
const router = express.Router();

router.get("/:cognitoId", getTenant);
router.put("/:cognitoId" , updateTenant);
router.get("/:cognitoId/current-residences", getCurrentResidences); 
router.post("/", createTenant);
router.post("/:cognitoId/favorites/:propertyId", addFavoriteProperty);
router.delete("/:cognitoId/favorites/:propertyId", removeFavoriteProperty); // Assuming this is to remove a favorite property

export default router;