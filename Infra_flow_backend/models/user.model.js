import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const roles = ['student', 'worker', 'admin', 'authority'];
const departments = ['electrical', 'mechanical', 'civil', 'it', 'management'];

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    rollNumber: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9-]{5,15}$/i, 'Invalid roll number format'],
      required: function requireRollNumber() {
        return this.role === 'student';
      },
      unique: true,
      sparse: true,
    },
    mobileNumber: {
      type: String,
      trim: true,
      match: [/^\d{10}$/, 'Invalid mobile number format'],
      required: function requireMobileNumber() {
        return this.role === 'worker';
      },
      unique: true,
      sparse: true,
    },
    department: {
      type: String,
      lowercase: true,
      enum: departments,
      required: function requireDepartment() {
        return this.role === 'student' || this.role === 'worker';
      },
    },
    email: {
      type: String,
      required: function requireEmail() {
        return this.role === 'authority';
      },
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true,
      match: [/^[\w-.]+@[\w-]+\.[a-z]{2,}$/i, 'Invalid email address'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: roles,
      required: true,
    },
    skills: {
      type: [String],
      enum: ['electrical', 'plumbing', 'furniture', 'network', 'equipment'],
      default: [],
    },
    dailyComplaintCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    lastComplaintAt: Date,
    photoUrl: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.virtual('password').set(function setPassword(_) {
  // Plaintext password is intentionally not persisted.
});

export default model('User', userSchema);
