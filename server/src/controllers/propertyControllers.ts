import { Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { wktToGeoJSON } from "@terraformer/wkt";
import { S3Client } from "@aws-sdk/client-s3";
import { Location } from "@prisma/client";
import { Upload } from "@aws-sdk/lib-storage";
import axios from "axios";

const prisma = new PrismaClient();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
});

export const getProperties = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      favoriteIds,
      priceMin,
      priceMax,
      beds,
      baths,
      propertyType,
      squareFeetMin,
      squareFeetMax,
      amenities,
      availableFrom,
      latitude,
      longitude,
    } = req.query;

    let whereConditions: Prisma.Sql[] = [];

    if (favoriteIds) {
      const favoriteIdsArray = (favoriteIds as string).split(",").map(Number);
      whereConditions.push(
        Prisma.sql`p.id IN (${Prisma.join(favoriteIdsArray)})`
      );
    }

    if (priceMin) {
      whereConditions.push(
        Prisma.sql`p."pricePerMonth" >= ${Number(priceMin)}`
      );
    }

    if (priceMax) {
      whereConditions.push(
        Prisma.sql`p."pricePerMonth" <= ${Number(priceMax)}`
      );
    }

    if (beds && beds !== "any") {
      whereConditions.push(Prisma.sql`p.beds >= ${Number(beds)}`);
    }

    if (baths && baths !== "any") {
      whereConditions.push(Prisma.sql`p.baths >= ${Number(baths)}`);
    }

    if (squareFeetMin) {
      whereConditions.push(
        Prisma.sql`p."squareFeet" >= ${Number(squareFeetMin)}`
      );
    }

    if (squareFeetMax) {
      whereConditions.push(
        Prisma.sql`p."squareFeet" <= ${Number(squareFeetMax)}`
      );
    }

    if (propertyType && propertyType !== "any") {
      whereConditions.push(
        Prisma.sql`p."propertyType" = ${propertyType}::"PropertyType"`
      );
    }

    if (amenities && amenities !== "any") {
      const amenitiesArray = (amenities as string).split(",");
      // Cast the text array to Amenity enum array for proper comparison
      const amenityEnumArray = amenitiesArray.map(a => `'${a}'::"Amenity"`).join(',');
      whereConditions.push(Prisma.sql`p.amenities @> ARRAY[${Prisma.raw(amenityEnumArray)}]`);
    }

    if (availableFrom && availableFrom !== "any") {
      const availableFromDate =
        typeof availableFrom === "string" ? availableFrom : null;
      if (availableFromDate) {
        const date = new Date(availableFromDate);
        if (!isNaN(date.getTime())) {
          whereConditions.push(
            Prisma.sql`EXISTS (
              SELECT 1 FROM "Lease" l 
              WHERE l."propertyId" = p.id 
              AND l."startDate" <= ${date.toISOString()}
            )`
          );
        }
      }
    }
    let lat: number | null = null;
    let lng: number | null = null;
    if (latitude && longitude) {
       lat = parseFloat(latitude as string);
       lng = parseFloat(longitude as string);
      const radiusInKilometers = 50; // More reasonable radius for city searches
      const degrees = radiusInKilometers / 111; // Converts kilometers to degrees

      whereConditions.push(
        Prisma.sql`ST_DWithin(
          l.coordinates::geometry,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
          ${degrees}
        )`
      );
    }

    const completeQuery = Prisma.sql`
  SELECT 
    p.*,
    json_build_object(
      'id', l.id,
      'address', l.address,
      'city', l.city,
      'state', l.state,
      'country', l.country,
      'postalCode', l."postalCode",
      'coordinates', json_build_object(
        'longitude', ST_X(l."coordinates"::geometry),
        'latitude', ST_Y(l."coordinates"::geometry)
      )
    ) as location
    ${
      lat !== null && lng !== null
        ? Prisma.sql`,
          ST_Distance(
            l.coordinates::geometry,
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
          ) as distance
        `
        : Prisma.empty
    }
  FROM "Property" p
  JOIN "Location" l ON p."locationId" = l.id
  ${
    whereConditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(whereConditions, " AND ")}`
      : Prisma.empty
  }
  ${
    lat !== null && lng !== null
      ? Prisma.sql`ORDER BY distance ASC`
      : Prisma.empty
  }
`;
    const properties = await prisma.$queryRaw(completeQuery);

    res.json(properties);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving properties: ${error.message}` });
  }
};

export const getProperty = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Validate ID is a number
    const propertyId = Number(id);
    if (isNaN(propertyId)) {
      console.error(`Invalid property ID: ${id}`);
      res.status(400).json({ message: `Invalid property ID: ${id}` });
      return;
    }
    
    console.log(`Fetching property with ID: ${propertyId}`);
    
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        location: true,
      },
    });

    if (!property) {
      console.log(`Property with ID ${propertyId} not found`);
      res.status(404).json({ message: `Property with ID ${propertyId} not found` });
      return;
    }

    try {
      const coordinates: { coordinates: string }[] =
        await prisma.$queryRaw`SELECT ST_asText(coordinates) as coordinates from "Location" where id = ${property.location.id}`;

      const geoJSON: any = wktToGeoJSON(coordinates[0]?.coordinates || "");
      const longitude = geoJSON.coordinates[0];
      const latitude = geoJSON.coordinates[1];

      const propertyWithCoordinates = {
        ...property,
        location: {
          ...property.location,
          coordinates: {
            longitude,
            latitude,
          },
        },
      };
      res.json(propertyWithCoordinates);
    } catch (error) {
      console.error(`Error processing coordinates for property ${propertyId}:`, error);
      // Return the property without coordinates rather than failing
      res.json({
        ...property,
        location: {
          ...property.location,
          coordinates: {
            longitude: null,
            latitude: null,
          },
        },
      });
    }
  } catch (err: any) {
    console.error(`Error retrieving property ${req.params.id}:`, err);
    res
      .status(500)
      .json({ message: `Error retrieving property: ${err.message}` });
  }
};

export const createProperty = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log("Received property creation request:", req.body);
    
    const files = req.files as Express.Multer.File[] || [];
    const {
      address,
      city,
      state,
      country,
      postalCode,
      managerCognitoId,
      coordinates,
      ...propertyData
    } = req.body;

    console.log("Property data:", propertyData);
    console.log("Files count:", files.length);

    // Handle photo uploads
    let photoUrls: string[] = [];
    if (files && files.length > 0) {
      const uploadedUrls = await Promise.all(
        files.map(async (file) => {
          const uploadParams = {
            Bucket: process.env.S3_BUCKET_NAME!,
            Key: `properties/${Date.now()}-${file.originalname}`,
            Body: file.buffer,
            ContentType: file.mimetype,
          };

          const uploadResult = await new Upload({
            client: s3Client,
            params: uploadParams,
          }).done();

          return uploadResult.Location;
        })
      );
      photoUrls = uploadedUrls.filter((url): url is string => url !== undefined);
    }

    // Use coordinates from frontend if provided, otherwise fallback to geocoding
    let longitude = 0;
    let latitude = 0;

    if (coordinates) {
      try {
        const coordsArray = JSON.parse(coordinates as string);
        if (Array.isArray(coordsArray) && coordsArray.length === 2) {
          [longitude, latitude] = coordsArray;
        }
      } catch (error) {
        console.error("Error parsing coordinates:", error);
      }
    }

    // Fallback to geocoding if coordinates are not provided or invalid
    if (longitude === 0 && latitude === 0) {
      try {
        const geocodingUrl = `https://nominatim.openstreetmap.org/search?${new URLSearchParams(
          {
            street: address,
            city,
            country,
            postalcode: postalCode,
            format: "json",
            limit: "1",
          }
        ).toString()}`;
        const geocodingResponse = await axios.get(geocodingUrl, {
          headers: {
            "User-Agent": "RealEstateApp (justsomedummyemail@gmail.com",
          },
        });
        [longitude, latitude] =
          geocodingResponse.data[0]?.lon && geocodingResponse.data[0]?.lat
            ? [
                parseFloat(geocodingResponse.data[0]?.lon),
                parseFloat(geocodingResponse.data[0]?.lat),
              ]
            : [0, 0];
      } catch (error) {
        console.error("Error in geocoding:", error);
        [longitude, latitude] = [0, 0];
      }
    }

    console.log("Final coordinates:", { longitude, latitude });

    // create location
    const [location] = await prisma.$queryRaw<Location[]>`
      INSERT INTO "Location" (address, city, state, country, "postalCode", coordinates)
      VALUES (${address}, ${city}, ${state}, ${country}, ${postalCode}, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326))
      RETURNING id, address, city, state, country, "postalCode", ST_AsText(coordinates) as coordinates;
    `;

    console.log("Location created:", location);

    // Process amenities and highlights
    const amenities = typeof propertyData.amenities === "string" 
      ? propertyData.amenities.split(",").filter((item: string): item is string => item.trim() !== "")
      : [];
    
    const highlights = typeof propertyData.highlights === "string"
      ? propertyData.highlights.split(",").filter((item: string): item is string => item.trim() !== "")
      : [];

    console.log("Processed amenities:", amenities);
    console.log("Processed highlights:", highlights);

    // create property
    const newProperty = await prisma.property.create({
      data: {
        name: propertyData.name,
        description: propertyData.description,
        pricePerMonth: parseFloat(propertyData.pricePerMonth),
        securityDeposit: parseFloat(propertyData.securityDeposit),
        applicationFee: parseFloat(propertyData.applicationFee),
        photoUrls,
        amenities: amenities as any,
        highlights: highlights as any,
        isPetsAllowed: propertyData.isPetsAllowed === "true",
        isParkingIncluded: propertyData.isParkingIncluded === "true",
        beds: parseInt(propertyData.beds),
        baths: parseFloat(propertyData.baths),
        squareFeet: parseInt(propertyData.squareFeet),
        propertyType: propertyData.propertyType,
        locationId: location.id,
        managerCognitoId,
      },
      include: {
        location: true,
        manager: true,
      },
    });

    console.log("Property created successfully:", newProperty);
    res.status(201).json(newProperty);
  } catch (err: any) {
    console.error("Error creating property:", err);
    console.error("Error stack:", err.stack);
    res
      .status(500)
      .json({ 
        message: `Error creating property: ${err.message}`,
        details: err.stack 
      });
  }
};

export const getPropertyLeases = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Validate ID is a number
    const propertyId = Number(id);
    if (isNaN(propertyId)) {
      console.error(`Invalid property ID: ${id}`);
      res.status(400).json({ message: `Invalid property ID: ${id}` });
      return;
    }
    
    console.log(`Fetching leases for property with ID: ${propertyId}`);
    
    // First check if the property exists
    const propertyExists = await prisma.property.findUnique({
      where: { id: propertyId }
    });
    
    if (!propertyExists) {
      console.log(`Property with ID ${propertyId} not found`);
      res.status(404).json({ 
        message: `Property with ID ${propertyId} not found` 
      });
      return;
    }
    
    // Get leases for the property with tenant information
    const leases = await prisma.lease.findMany({
      where: { propertyId },
      include: {
        tenant: true,
      }
    });
    
    console.log(`Found ${leases.length} leases for property ${propertyId}`);
    
    res.json(leases);
  } catch (error: any) {
    console.error(`Error retrieving leases for property ${req.params.id}:`, error);
    res.status(500).json({ 
      message: `Error retrieving leases for property: ${error.message}` 
    });
  }
};