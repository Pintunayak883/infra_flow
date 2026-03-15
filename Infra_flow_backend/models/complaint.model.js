import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const categories = ['electrical', 'plumbing', 'furniture', 'network', 'equipment'];
const statuses = ['pending', 'in-progress', 'completed'];
const priorities = ['normal', 'high', 'urgent'];

const complaintSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    roomNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    category: {
      type: String,
      enum: categories,
      required: true,
    },
    priority: {
      type: String,
      enum: priorities,
      default: 'normal',
    },
    status: {
      type: String,
      enum: statuses,
      default: 'pending',
    },
    photoUrl: {
      type: String,
      required: true,
      alias: 'photo',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      alias: 'reportedBy',
    },
    assignedWorker: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedWorkerProfile: {
      type: Schema.Types.ObjectId,
      ref: 'Worker',
    },
    duplicateOf: {
      type: Schema.Types.ObjectId,
      ref: 'Complaint',
    },
    mergedReports: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        reportedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    voiceTranscript: String,
    qrCodeId: String,
    repairCost: {
      estimate: {
        type: Number,
        min: 0,
      },
      approvedAmount: {
        type: Number,
        min: 0,
      },
      approvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      approvedAt: Date,
    },
    history: [
      {
        status: {
          type: String,
          enum: statuses,
          required: true,
        },
        note: String,
        actor: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

complaintSchema.index({ roomNumber: 1, category: 1, status: 1 });
complaintSchema.index({ createdBy: 1, createdAt: 1 });
complaintSchema.index({ assignedWorker: 1, status: 1 });

export default model('Complaint', complaintSchema);
