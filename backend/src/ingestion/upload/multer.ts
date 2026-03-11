/**
 * Multer configuration for CSV uploads.
 * Files are kept in memory (Buffer) — no disk writes.
 */
import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowed = ["text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"];
  if (allowed.includes(file.mimetype) || file.originalname.endsWith(".csv")) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Only CSV files are accepted.`));
  }
};

export const csvUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max
    files: 1,
  },
});
