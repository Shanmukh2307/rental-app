import { Request,Response } from "express";
import { PrismaClient } from "@prisma/client";
import { wktToGeoJSON } from "@terraformer/wkt";

const prisma = new PrismaClient();

export const getTenant = async (req: Request, res: Response) : Promise<void> => {
    try{
        const { cognitoId } = req.params;
        const tenant = await prisma.tenant.findUnique({
            where: { cognitoId },
            include : {
                favorites :true
            }
        });

        if (tenant) {
            res.json(tenant);
        } else{
            res.status(404).json({ message: "Tenant not found" });
        }
    } catch (error : any) {
        res
        .status(500)
        .json({ message: "Error retrieving tenant", error: error.message });
    }
};

export const createTenant = async (req: Request, res: Response) : Promise<void> => {
    try {
        const { cognitoId, name, email, phoneNumber } = req.body;

        if (!cognitoId || !name || !email) {
            res.status(400).json({ message: "Missing required fields" });
            return;
        }

        const newTenant = await prisma.tenant.create({
            data: {
                cognitoId,
                name,
                email,
                phoneNumber,
            }
        });

        res.status(201).json(newTenant);
    } catch (error : any) {
        res
        .status(500)
        .json({ message: "Error creating tenant", error: error.message });
    }
};

export const updateTenant = async (req: Request, res: Response) : Promise<void> => {
    try {
        const { cognitoId } = req.params;
        const { name, email, phoneNumber } = req.body;

        if (!name || !email) {
            res.status(400).json({ message: "Missing required fields" });
            return;
        }

        const updateTenant = await prisma.tenant.update({
            where: { cognitoId },
            data: {
                name,
                email,
                phoneNumber,
            }
        });

        res.status(201).json(updateTenant);
    } catch (error : any) {
        res
        .status(500)
        .json({ message: "Error updating tenant", error: error.message });
    }
};

export const getCurrentResidences = async (req: Request, res: Response) : Promise<void> => {
    try {
        const { cognitoId } = req.params;
        
        // Find only approved applications with active leases for this tenant
        const approvedApplications = await prisma.application.findMany({
            where: { 
                tenantCognitoId: cognitoId,
                status: "Approved",
                leaseId: { not: null } // Only applications that have a lease
            },
            include: { 
                lease: true,
                property: { include: { location: true } } 
            },
        });

        // Filter for currently active leases (current date is between start and end dates)
        const currentDate = new Date();
        const activeResidences = approvedApplications.filter(app => {
            if (!app.lease) return false;
            return app.lease.startDate <= currentDate && app.lease.endDate >= currentDate;
        });

        const residencesWithFormattedLocation = await Promise.all(
            activeResidences.map(async (app) => {
                const property = app.property;
                const coordinates: { coordinates: string }[] =
                    await prisma.$queryRaw`SELECT ST_asText(coordinates) as coordinates FROM "Location" WHERE id = ${property.location.id}`;
                const geoJSON: any = wktToGeoJSON(coordinates[0].coordinates || "");
                const longitude = geoJSON.coordinates[0];
                const latitude = geoJSON.coordinates[1];

                return {
                    ...property,
                    location: {
                        ...property.location,
                        coordinates: { latitude, longitude },
                    },
                    lease: {
                        startDate: app.lease!.startDate,
                        endDate: app.lease!.endDate,
                        rent: app.lease!.rent,
                        deposit: app.lease!.deposit,
                    },
                    application: {
                        id: app.id,
                        applicationDate: app.applicationDate,
                        status: app.status,
                    },
                };
            })
        );

        res.status(200).json(residencesWithFormattedLocation);
    } catch (error: any) {
        res.status(500).json({ message: "Error retrieving tenant residences", error: error.message });
    }
}

export const addFavoriteProperty = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { cognitoId, propertyId } = req.params;
    const tenant = await prisma.tenant.findUnique({
      where: { cognitoId },
      include: { favorites: true },
    });

    if (!tenant) {
      res.status(404).json({ message: "Tenant not found" });
      return;
    }

    const propertyIdNumber = Number(propertyId);
    const existingFavorites = tenant.favorites || [];

    if (!existingFavorites.some((fav) => fav.id === propertyIdNumber)) {
      const updatedTenant = await prisma.tenant.update({
        where: { cognitoId },
        data: {
          favorites: {
            connect: { id: propertyIdNumber },
          },
        },
        include: { favorites: true },
      });
      res.json(updatedTenant);
    } else {
      res.status(409).json({ message: "Property already added as favorite" });
    }
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error adding favorite property: ${error.message}` });
  }
};

export const removeFavoriteProperty = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { cognitoId, propertyId } = req.params;
    const propertyIdNumber = Number(propertyId);

    const updatedTenant = await prisma.tenant.update({
      where: { cognitoId },
      data: {
        favorites: {
          disconnect: { id: propertyIdNumber },
        },
      },
      include: { favorites: true },
    });

    res.json(updatedTenant);
  } catch (err: any) {
    res
      .status(500)
      .json({ message: `Error removing favorite property: ${err.message}` });
  }
};