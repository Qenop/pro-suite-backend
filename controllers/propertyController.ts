// backend/controllers/propertyController.ts
import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Property from '../models/propertyModel';
import Tenant from '../models/tenantModel';

// @desc Create a new property
export const createProperty = asyncHandler(async (req: Request, res: Response) => {
  const {
    propertyName,
    address,
    propertyType,
    serviceRate,
    paymentDetails,
    landlord, // { name, phone, email }
    utilities,
    units,
  } = req.body;

  const newProperty = new Property({
    propertyName,
    address,
    propertyType,
    serviceRate,
    paymentDetails,
    landlord, // ← embedded directly
    utilities,
    units,
  });

  const savedProperty = await newProperty.save();
  res.status(201).json(savedProperty);
});

// @desc Get all properties
export const getProperties = asyncHandler(async (req: Request, res: Response) => {
  const properties = await Property.find();
  res.status(200).json(properties);
});

// @desc Get property by ID (with tenant data only)
export const getPropertyById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error('Invalid property ID');
  }

  // Populate tenant details within unitIds
  const property = await Property.findById(id)
    .populate({
      path: 'units.unitIds.tenant',
      model: 'Tenant',
      select: 'name phone email idNumber', // Select only necessary tenant details
    });

  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }

  res.status(200).json(property);
});

// @desc Delete property if no tenants assigned
export const deleteProperty = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  console.log('🗑️ DELETE /api/properties/:id called with ID:', id);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error('Invalid property ID');
  }

  const property = await Property.findById(id);

  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }

  const tenantCount = await Tenant.countDocuments({ propertyId: id });
  console.log(`👥 ${tenantCount} tenants found for property ${id}`);

  if (tenantCount > 0) {
    res.status(400);
    throw new Error('Cannot delete property: Tenants are still assigned to it.');
  }

  await property.deleteOne();
  res.status(200).json({ message: 'Property deleted successfully' });
});

// @desc Update a property by ID
export const updateProperty = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  console.log('✏️ PUT /api/properties/:id called with ID:', id);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: 'Invalid property ID' });
    return;
  }

  const property = await Property.findById(id);

  if (!property) {
    res.status(404).json({ message: 'Property not found' });
    return;
  }

  try {
    const updatedProperty = await Property.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedProperty) {
      throw new Error("Property update failed");  // Manually throwing an error if update failed
    }

    // Send success response
    res.status(200).json(updatedProperty);
  } catch (err: any) {
    console.error('Error updating property:', err);
    res.status(500).json({
      message: 'Failed to update property',
      error: err?.message || 'Unknown error',
    });
  }
});
