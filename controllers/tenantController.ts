import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Tenant from '../models/tenantModel';
import Property from '../models/propertyModel';

// @desc Create a new tenant and mark the assigned unit as Occupied
export const createTenant = asyncHandler(async (req: Request, res: Response) => {
  const { 
    name, 
    phone, 
    email, 
    idNumber, 
    unitId, 
    propertyId, 
    rent, 
    deposit, 
    leaseStartDate, 
    initialWaterReading,
    notes,
    occupation,
    gender,
    emergencyContact
  } = req.body;

  // Handle profile picture if uploaded with multer
  const profilePicture = req.file ? `profile-pictures/${req.file.filename}` : undefined;


  // Parse emergencyContact if it's a string
  let parsedEmergencyContact = emergencyContact;
  if (typeof emergencyContact === 'string') {
    try {
      parsedEmergencyContact = JSON.parse(emergencyContact);
    } catch (error) {
      res.status(400);
      throw new Error('Invalid format for emergencyContact. Must be valid JSON.');
    }
  }

  // Validate required fields
  if (!name || !phone || !idNumber || !unitId || !propertyId || !rent || !deposit) {
    res.status(400);
    throw new Error('All required fields (name, phone, idNumber, unitId, propertyId, rent, deposit) must be provided');
  }

  // Create and save tenant
  const newTenant = new Tenant({
    name,
    phone,
    email,
    idNumber,
    propertyId,
    unitId,
    rent,
    deposit,
    leaseStartDate,
    initialWaterReading,
    profilePicture,
    notes,
    occupation,
    gender,
    emergencyContact: parsedEmergencyContact,
  });

  const savedTenant = await newTenant.save();

  // Fetch property and check for unit availability
  const property = await Property.findById(propertyId);
  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }

  let unitUpdated = false;

  // Loop through units in the property to find the matching unit
  for (const unitGroup of property.units) {
    const unitObj = unitGroup.unitIds.find(u => String(u.unitId).trim().toLowerCase() === String(unitId).trim().toLowerCase());
    if (unitObj) {
      unitObj.status = 'occupied';  // Mark unit as occupied
      unitUpdated = true;
      property.markModified('units');
      break;
    }
  }

  if (!unitUpdated) {
    res.status(404);
    throw new Error('Assigned unit not found in property');
  }

  // Save the updated property with unit status
  await property.save();

  // Return saved tenant
  res.status(201).json(savedTenant);
});

// @desc Get all tenants or filter by property, unitType, status, and search
export const getTenants = asyncHandler(async (req: Request, res: Response) => {
  const { propertyId, unitType, status, search, unitId } = req.query;

  // Build filter object for querying
  const filter: any = {};

  if (propertyId) filter.propertyId = propertyId;
  if (unitType) filter.unitType = unitType;
  if (status) filter.status = status;
  if (unitId) filter.unitId = unitId;

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { idNumber: { $regex: search, $options: 'i' } }
    ];
  }

  // Populate only the 'name' field of the related property
  const tenants = await Tenant.find(filter)
    .populate({ path: 'propertyId', select: 'name' })
    .lean();

  res.status(200).json(tenants);
});

// @desc Get a tenant by ID
export const getTenantById = asyncHandler(async (req: Request, res: Response) => {
  const tenant = await Tenant.findById(req.params.id);
  if (!tenant) {
    res.status(404);
    throw new Error('Tenant not found');
  }
  res.status(200).json(tenant);
});

// @desc Update a tenant
export const updateTenant = asyncHandler(async (req: Request, res: Response) => {
  const tenant = await Tenant.findById(req.params.id);
  if (!tenant) {
    res.status(404);
    throw new Error('Tenant not found');
  }

  const {
    name,
    phone,
    email,
    idNumber,
    unitId,
    propertyId,
    rent,
    deposit,
    leaseStartDate,
    initialWaterReading,
    notes,
    occupation,
    gender,
    emergencyContact
  } = req.body;

  // Handle profile picture if uploaded with multer
  const profilePicture = req.file ? `profile-pictures/${req.file.filename}` : tenant.profilePicture;


  // Parse emergencyContact if it's a string
  let parsedEmergencyContact = emergencyContact;
  if (typeof emergencyContact === 'string') {
    try {
      parsedEmergencyContact = JSON.parse(emergencyContact);
    } catch (error) {
      res.status(400);
      throw new Error('Invalid format for emergencyContact. Must be valid JSON.');
    }
  }

  // Update tenant fields
  tenant.name = name ?? tenant.name;
  tenant.phone = phone ?? tenant.phone;
  tenant.email = email ?? tenant.email;
  tenant.idNumber = idNumber ?? tenant.idNumber;
  tenant.unitId = unitId ?? tenant.unitId;
  tenant.propertyId = propertyId ?? tenant.propertyId;
  tenant.rent = rent ?? tenant.rent;
  tenant.deposit = deposit ?? tenant.deposit;
  tenant.leaseStartDate = leaseStartDate ?? tenant.leaseStartDate;
  tenant.initialWaterReading = initialWaterReading ?? tenant.initialWaterReading;
  tenant.profilePicture = profilePicture;
  tenant.notes = notes ?? tenant.notes;
  tenant.occupation = occupation ?? tenant.occupation;
  tenant.gender = gender ?? tenant.gender;
  tenant.emergencyContact = parsedEmergencyContact ?? tenant.emergencyContact;

  const updatedTenant = await tenant.save();

  res.status(200).json(updatedTenant);
});

// @desc Delete tenant and mark the unit as vacant
export const deleteTenant = asyncHandler(async (req: Request, res: Response) => {
  const tenant = await Tenant.findById(req.params.id);
  if (!tenant) {
    res.status(404);
    throw new Error('Tenant not found');
  }

  const tenantUnitId = String(tenant.unitId);

  const property = await Property.findById(tenant.propertyId);
  if (property) {
    let unitFound = false;

    // Loop through property units and mark the unit as vacant
    for (const unitGroup of property.units) {
      const unitObj = unitGroup.unitIds.find(u => String(u.unitId) === tenantUnitId);
      if (unitObj) {
        unitObj.status = 'vacant'; // Mark unit as vacant
        unitFound = true;
        property.markModified('units');
        break;
      }
    }

    if (!unitFound) {
      res.status(404);
      throw new Error('Unit not found in property');
    }

    await property.save();
  }

  // Delete tenant
  await tenant.deleteOne();
  res.status(200).json({ message: 'Tenant deleted and unit marked as vacant' });
});
