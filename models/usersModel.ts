//E:\PROJECTS\pro-suite-app\backend\models\usersModel.ts
import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  fullName: string;
  email: string;
  phone: string;
  role: 'caretaker' | 'landlord' | 'admin'; // ✅ Include admin
  password: string;
  propertyId?: mongoose.Types.ObjectId; // ✅ Optional, required conditionally
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema: Schema<IUser> = new Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    role: {
      type: String,
      enum: ['caretaker', 'landlord', 'admin'], // ✅ Allow admin
      required: true,
    },
    password: { type: String, required: true },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: function (this: IUser) {
        return this.role === 'caretaker' || this.role === 'landlord';
      },
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ✅ Password comparison method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;
