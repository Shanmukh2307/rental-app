import { Request,Response } from "express";
import { PrismaClient } from "@prisma/client";

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