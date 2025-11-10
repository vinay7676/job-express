import mongoose from "mongoose";

const pdfSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
  },
  filepath: {
    type: String,
    required: true, // This will now store ImageKit URL
  },
  fileId: {
    type: String,
    required: true, // ImageKit file ID for deletion
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  hrId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hr",
    required: true,
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job",
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

const Pdf = mongoose.model("Pdf", pdfSchema);
export default Pdf;