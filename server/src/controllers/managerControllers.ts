import { Request,Response } from "express";
import { PrismaClient } from "@prisma/client";
import { wktToGeoJSON } from "@terraformer/wkt";

const prisma = new PrismaClient();

export const getManager = async (req: Request, res: Response) : Promise<void> => {
    try{
        const { cognitoId } = req.params;
        const manager = await prisma.manager.findUnique({
            where: { cognitoId },
        });

        if (manager) {
            res.json(manager);
        } else{
            res.status(404).json({ message: "Manager not found" });
        }
    } catch (error : any) {
        res
        .status(500)
        .json({ message: "Error retrieving manager", error: error.message });
    }
};

export const createManager = async (req: Request, res: Response) : Promise<void> => {
    try {
        const { cognitoId, name, email, phoneNumber } = req.body;

        if (!cognitoId || !name || !email) {
            res.status(400).json({ message: "Missing required fields" });
            return;
        }

        const newManager = await prisma.manager.create({
            data: {
                cognitoId,
                name,
                email,
                phoneNumber,
            }
        });

        res.status(201).json(newManager);
    } catch (error : any) {
        res
        .status(500)
        .json({ message: "Error creating manager", error: error.message });
    }
};

export const updateManager = async (req: Request, res: Response) : Promise<void> => {
    try {
        const { cognitoId } = req.params;
        const { name, email, phoneNumber } = req.body;

        if (!name || !email) {
            res.status(400).json({ message: "Missing required fields" });
            return;
        }

        const updateManager = await prisma.manager.update({
            where: { cognitoId },
            data: {
                name,
                email,
                phoneNumber,
            }
        });

        res.status(201).json(updateManager);
    } catch (error : any) {
        res
        .status(500)
        .json({ message: "Error updating manager", error: error.message });
    }
};

export const getManagerProperties = async (req: Request, res: Response) : Promise<void> => {
    try{
        const { cognitoId } = req.params;
        
        console.log(`Fetching properties for manager with cognitoId: ${cognitoId}`);
        
        // Check if manager exists first
        const managerExists = await prisma.manager.findUnique({
            where: { cognitoId }
        });
        
        if (!managerExists) {
            console.log(`Manager with cognitoId ${cognitoId} not found`);
            res.status(404).json({ 
                message: `Manager with ID ${cognitoId} not found` 
            });
            return;
        }
        
        const properties = await prisma.property.findMany({
            where: { managerCognitoId: cognitoId },
            include: {
                location: true,
            },
        });
        
        console.log(`Found ${properties.length} properties for manager ${cognitoId}`);

        const propertiesWithFormattedLocation = await Promise.all(
            properties.map(async (property) => {
                try {
                    const coordinates : { coordinates : string}[] =
                    await prisma.$queryRaw`SELECT ST_asText(coordinates) as coordinates FROM "Location" WHERE id = ${property.location.id}`;
                    
                    // Handle case where coordinates might be null
                    if (!coordinates || !coordinates[0] || !coordinates[0].coordinates) {
                        console.log(`No coordinates found for location id: ${property.location.id}`);
                        return {
                            ...property,
                            location: {
                                ...property.location,
                                latitude: null,
                                longitude: null,
                            }
                        };
                    }
                    
                    const geoJSON : any = wktToGeoJSON(coordinates[0].coordinates || "");
                    const longitude = geoJSON.coordinates[0];
                    const latitude = geoJSON.coordinates[1];

                    return {
                        ...property,
                        location: {
                            ...property.location,
                            latitude,
                            longitude,
                        }
                    };
                } catch (error: any) {
                    console.error(`Error processing coordinates for property ${property.id}:`, error);
                    // Return the property without coordinates rather than failing
                    return {
                        ...property,
                        location: {
                            ...property.location,
                            latitude: null,
                            longitude: null,
                        }
                    };
                }
            })
        );
       
         res.status(200).json(propertiesWithFormattedLocation);
    } 
    catch (error : any) {
        res
        .status(500)
        .json({ message: "Error retrieving manager properties", error: error.message });
    }
}