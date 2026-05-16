import Document from "../models/Document.js";
import User from "../models/User.js";

export const createDocument = async (req, res) => {
  try {
    const doc = await Document.create({
      title: req.body.title || "Untitled Document",
      content: "",
      owner: req.user._id,
      collaborators: [],
      versions: [],
    });

    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserDocuments = async (req, res) => {
  try {
    const docs = await Document.find({
      $or: [
        { owner: req.user._id },
        { "collaborators.user": req.user._id }
      ]
    })
      .populate("owner", "name email")
      .populate("collaborators.user", "name email")
      .sort({ updatedAt: -1 });

    res.status(200).json(docs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSingleDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate("owner", "name email")
      .populate("collaborators.user", "name email");

    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    const isOwner = doc.owner._id.toString() === req.user._id.toString();
    const isCollaborator = doc.collaborators.some(
      (c) => c.user._id.toString() === req.user._id.toString()
    );

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.status(200).json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    const isOwner = doc.owner.toString() === req.user._id.toString();
    const collaborator = doc.collaborators.find(
      (c) => c.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !collaborator) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!isOwner && collaborator.role === "viewer") {
      return res.status(403).json({ message: "You have view-only access" });
    }

    const oldContent = doc.content;

    doc.title = req.body.title ?? doc.title;
    doc.content = req.body.content ?? doc.content;

    if (req.body.content !== undefined && req.body.content !== oldContent) {
      doc.versions.push({
        content: oldContent,
        editedBy: req.user._id,
        editedAt: new Date(),
      });

      if (doc.versions.length > 20) {
        doc.versions = doc.versions.slice(-20);
      }
    }

    const updatedDoc = await doc.save();

    res.status(200).json(updatedDoc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (doc.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only owner can delete document" });
    }

    await doc.deleteOne();

    res.status(200).json({ message: "Document deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const shareDocument = async (req, res) => {
  try {
    const { email, role } = req.body;

    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (doc.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only owner can share document" });
    }

    const userToShare = await User.findOne({ email });

    if (!userToShare) {
      return res.status(404).json({ message: "User not found" });
    }

    if (userToShare._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Owner already has access" });
    }

    const existingCollaborator = doc.collaborators.find(
      (c) => c.user.toString() === userToShare._id.toString()
    );

    if (existingCollaborator) {
      existingCollaborator.role = role || existingCollaborator.role;
    } else {
      doc.collaborators.push({
        user: userToShare._id,
        role: role || "editor",
      });
    }

    await doc.save();

    const updatedDoc = await Document.findById(req.params.id)
      .populate("owner", "name email")
      .populate("collaborators.user", "name email");

    res.status(200).json({
      message: "Document shared successfully",
      document: updatedDoc,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const searchDocuments = async (req, res) => {
  try {
    const search = req.query.search || "";

    const docs = await Document.find({
      $and: [
        {
          $or: [
            { owner: req.user._id },
            { "collaborators.user": req.user._id }
          ]
        },
        {
          title: { $regex: search, $options: "i" }
        }
      ]
    })
      .populate("owner", "name email")
      .populate("collaborators.user", "name email")
      .sort({ updatedAt: -1 });

    res.status(200).json(docs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDocumentVersions = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate("versions.editedBy", "name email");

    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    const isOwner = doc.owner.toString() === req.user._id.toString();
    const isCollaborator = doc.collaborators.some(
      (c) => c.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.status(200).json(doc.versions.reverse());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};