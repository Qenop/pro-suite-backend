/* seedAdmin.ts
import User from './models/usersModel'; // adjust path as needed
import bcrypt from 'bcrypt';

export const seedAdminUser = async () => {
  try {
    const existingAdmin = await User.findOne({ role: 'admin' });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);

      await User.create({
        fullName: 'System Admin',
        email: process.env.ADMIN_EMAIL || 'admin@prosuite.com',
        password: hashedPassword,
        role: 'admin',
        phone: '0700000000', // optional
      });

      console.log('✅ Admin user created');
    } else {
      console.log('ℹ️ Admin user already exists');
    }
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
};
*/