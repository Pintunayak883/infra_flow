import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const workerSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    skills: {
      type: [String],
      enum: ['electrical', 'plumbing', 'furniture', 'network', 'equipment'],
      required: true,
      validate: {
        validator(skills) {
          return Array.isArray(skills) && skills.length > 0;
        },
        message: 'Worker must have at least one skill',
      },
    },
    availability: {
      status: {
        type: String,
        enum: ['offline', 'online', 'busy'],
        default: 'offline',
      },
      shiftStart: Date,
      shiftEnd: Date,
    },
    currentLoad: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxLoad: {
      type: Number,
      default: 5,
      min: 1,
      max: 10,
    },
    lastAssignedAt: Date,
    assignedComplaints: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Complaint',
      },
    ],
    ratings: {
      type: Number,
      min: 1,
      max: 5,
    },
    notes: String,
  },
  {
    timestamps: true,
  },
);

workerSchema.virtual('isAvailable').get(function computeAvailability() {
  return this.availability.status === 'online' && this.currentLoad < this.maxLoad;
});

workerSchema.index({ skills: 1 });
workerSchema.index({ availability: 1 });

export default model('Worker', workerSchema);
