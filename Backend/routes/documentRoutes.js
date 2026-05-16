import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  createDocument,
  getUserDocuments,
  getSingleDocument,
  updateDocument,
  deleteDocument,
  shareDocument,
  searchDocuments,
  getDocumentVersions,
} from "../controllers/documentController.js";

const router = express.Router();

router.post("/", protect, createDocument);
router.get("/", protect, getUserDocuments);
router.get("/search/all", protect, searchDocuments);
router.get("/:id", protect, getSingleDocument);
router.put("/:id", protect, updateDocument);
router.delete("/:id", protect, deleteDocument);
router.post("/:id/share", protect, shareDocument);
router.get("/:id/versions", protect, getDocumentVersions);

export default router;