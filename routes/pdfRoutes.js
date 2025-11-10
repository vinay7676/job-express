import express from "express";
import multer from "multer";
import {
  uploadPdf,
  getPdfs,
  getResumesByHr,
  getResumesByJob,
  deletePdf,
} from "../controllers/pdfController.js";

const router = express.Router();

// Configure multer for memory storage (no disk storage needed)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only PDF files
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

// Routes
router.post("/upload", upload.single("pdf"), uploadPdf);
router.get("/", getPdfs);
router.get("/hr/:hrId", getResumesByHr);
router.get("/job/:jobId", getResumesByJob);
router.delete("/:pdfId", deletePdf); // Optional: delete route

export default router;