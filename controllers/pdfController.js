import Pdf from "../models/PdfModel.js";
import imagekit from "../config/imagekit.js";

export const uploadPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { userId, hrId, jobId } = req.body;

    // Validate required fields
    if (!userId || !hrId || !jobId) {
      return res.status(400).json({
        message: "Missing required fields: userId, hrId, and jobId are required",
      });
    }

    // Upload to ImageKit
    const uploadResponse = await imagekit.upload({
      file: req.file.buffer, // File buffer from memory storage
      fileName: `${Date.now()}_${req.file.originalname}`,
      folder: "/resumes", // Optional: organize files in folders
      tags: [`user_${userId}`, `job_${jobId}`, `hr_${hrId}`], // Optional: add tags for easy filtering
    });

    // Save to database
    const newPdf = new Pdf({
      filename: req.file.originalname,
      filepath: uploadResponse.url, // ImageKit URL
      fileId: uploadResponse.fileId, // Store fileId for future deletion
      userId,
      hrId,
      jobId,
    });

    await newPdf.save();
    res.status(201).json({
      message: "PDF uploaded successfully",
      pdf: newPdf,
    });
  } catch (error) {
    console.error("Error uploading PDF:", error);
    res.status(500).json({
      message: "Error uploading PDF",
      error: error.message,
    });
  }
};

export const getPdfs = async (req, res) => {
  try {
    const pdfs = await Pdf.find();
    res.status(200).json(pdfs);
  } catch (error) {
    res.status(500).json({ message: "Error fetching PDFs", error });
  }
};

export const getResumesByHr = async (req, res) => {
  try {
    const { hrId } = req.params;

    const resumes = await Pdf.find({ hrId })
      .populate("userId", "name email")
      .populate("jobId", "title position")
      .sort({ uploadedAt: -1 });

    res.status(200).json({ success: true, data: resumes });
  } catch (error) {
    res.status(500).json({ message: "Error fetching resumes", error });
  }
};

export const getResumesByJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const resumes = await Pdf.find({ jobId })
      .populate("userId", "name email contact")
      .sort({ uploadedAt: -1 });

    res.status(200).json({ success: true, data: resumes });
  } catch (error) {
    res.status(500).json({ message: "Error fetching resumes for job", error });
  }
};

// Optional: Delete PDF from ImageKit
export const deletePdf = async (req, res) => {
  try {
    const { pdfId } = req.params;

    const pdf = await Pdf.findById(pdfId);
    if (!pdf) {
      return res.status(404).json({ message: "PDF not found" });
    }

    // Delete from ImageKit
    await imagekit.deleteFile(pdf.fileId);

    // Delete from database
    await Pdf.findByIdAndDelete(pdfId);

    res.status(200).json({ message: "PDF deleted successfully" });
  } catch (error) {
    console.error("Error deleting PDF:", error);
    res.status(500).json({ message: "Error deleting PDF", error: error.message });
  }
};