import { Request, Response } from 'express';
import User from '../models/usersModel';
import Property from '../models/propertyModel';

export const createUser = async (req: Request, res: Response) => {
  try {
    const { fullName, email, phone, role, propertyId, password } = req.body;

    // Validate required fields
    if (!role || !propertyId || !password) {
      return res.status(400).json({ message: 'Role, propertyId, and password are required' });
    }

    let finalFullName = fullName;
    let finalEmail = email;
    let finalPhone = phone;

    // If role is landlord, fetch landlord info from the property and override user data
    if (role === 'landlord') {
      const property = await Property.findById(propertyId);

      if (!property) {
        return res.status(404).json({ message: 'Property not found' });
      }

      if (!property.landlord) {
        return res.status(400).json({ message: 'Selected property has no landlord info' });
      }

      // Override with property landlord info
      finalFullName = property.landlord.name;
      finalEmail = property.landlord.email;
      finalPhone = property.landlord.phone;
    } else {
      // For other roles, ensure fullName, email, phone are provided
      if (!fullName || !email || !phone) {
        return res.status(400).json({ message: 'Full name, email, and phone are required' });
      }
    }

    // Check if user with email already exists
    const existingUser = await User.findOne({ email: finalEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Restrict one landlord per property
    if (role === 'landlord') {
      const existingLandlord = await User.findOne({ role: 'landlord', propertyId });
      if (existingLandlord) {
        return res.status(409).json({ message: 'A landlord is already assigned to this property' });
      }
    }

    // Create user document
    const user = new User({
      fullName: finalFullName,
      email: finalEmail,
      phone: finalPhone,
      role,
      propertyId,
      password,
    });

    await user.save();

    // Return user info without password
    const userResponse = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      propertyId: user.propertyId,
    };

    return res.status(201).json(userResponse);
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all users with property name populated
// @route   GET /api/users
// @access  Protected (admin)
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find()
      .populate('propertyId', 'propertyName')
      .select('-password');

    return res.status(200).json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
export const getUsersByProperty = async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const users = await User.find({ propertyId }).populate('propertyId');
    res.status(200).json(users);
  } catch (err) {
    console.error('Error fetching users by property:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
