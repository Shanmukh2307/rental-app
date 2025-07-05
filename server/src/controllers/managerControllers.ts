import { Request,Response } from "express";
import { PrismaClient } from "@prisma/client";

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