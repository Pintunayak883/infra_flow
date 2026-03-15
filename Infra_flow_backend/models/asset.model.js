import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const assetSchema = new Schema(
  {
    assetName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    roomNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    qrCodeId: {
      type: String,
      required: true,
      unique: true,
    },
    repairHistory: [
      {
        complaint: {
          type: Schema.Types.ObjectId,
          ref: 'Complaint',
          required: true,
        },
        repairedBy: {
          type: Schema.Types.ObjectId,
          ref: 'Worker',
        },
        actionTaken: {
          type: String,
          trim: true,
          maxlength: 500,
        },
        repairedAt: {
          type: Date,
          default: Date.now,
        },
        cost: {
          type: Number,
          min: 0,
        },
      },
    ],
    lastMaintenanceDate: Date,
    maintenanceFrequencyDays: {
      type: Number,
      default: 90,
      min: 7,
    },
    replacementSuggested: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

assetSchema.index({ roomNumber: 1, assetName: 1 }, { unique: true });
assetSchema.index({ replacementSuggested: 1 });

export default model('Asset', assetSchema);
