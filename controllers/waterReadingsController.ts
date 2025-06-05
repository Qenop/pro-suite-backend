// E:\PROJECTS\pro-suite-app\backend\controllers\waterReadingsController.ts
import { Request, Response } from "express";
import WaterReading from "../models/waterReadingsModel";

export const createWaterReading = async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyId } = req.params;
    const { readingDate, readings } = req.body; // readings is an array of units with their respective readings

    // Validate the request body
    if (!readingDate || !readings || !Array.isArray(readings)) {
      res.status(400).json({ message: "Invalid request data" });
      return;
    }

    // Parse readingDate for comparison
    const newReadingDate = new Date(readingDate);
    if (isNaN(newReadingDate.getTime())) {
      res.status(400).json({ message: "Invalid readingDate format" });
      return;
    }

    // Enforce once-per-month rule: Check if there's an existing reading for this property in the same month/year
    const existingReading = await WaterReading.findOne({
      propertyId,
      readingDate: {
        $gte: new Date(newReadingDate.getFullYear(), newReadingDate.getMonth(), 1),
        $lt: new Date(newReadingDate.getFullYear(), newReadingDate.getMonth() + 1, 1),
      },
    });

    if (existingReading) {
      res.status(400).json({ message: "Water reading for this month already exists" });
      return;
    }

    // Create new water reading entry
    const newReading = new WaterReading({
      propertyId,
      readingDate: newReadingDate,
      readings,
    });

    await newReading.save();

    res.status(201).json({ message: "Water reading recorded successfully" });
  } catch (error) {
    console.error("Error creating water reading:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getWaterReadings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyId } = req.params;

    // Fetch readings sorted by readingDate ascending (oldest first)
    const readings = await WaterReading.find({ propertyId }).sort({ readingDate: 1 }).lean();

    // Calculate consumption
    const readingsWithConsumption = readings.map((reading, index) => {
      if (index === 0) {
        return {
          ...reading,
          consumption: reading.readings.map((unit: any) => ({
            unitId: unit.unitId,
            consumption: 0,
          })),
        };
      }

      const prevReading = readings[index - 1];

      const consumption = reading.readings.map((unit: any) => {
        const prevUnit = prevReading.readings.find((u: any) => u.unitId === unit.unitId);
        const prevValue = prevUnit ? prevUnit.readingValue : 0;
        const cons = unit.readingValue - prevValue;

        return {
          unitId: unit.unitId,
          consumption: cons >= 0 ? cons : 0,
        };
      });

      return {
        ...reading,
        consumption,
      };
    });

    // ✅ Reverse to return most recent first
    res.status(200).json(readingsWithConsumption.reverse());
  } catch (error) {
    console.error("Error fetching water readings:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
