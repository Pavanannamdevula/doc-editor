import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import API from "../utils/api";
import jsPDF from "jspdf";

const socket = io("https://doc-editor-faoe.onrender.com");

function EditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState("editor");
  const [documentData, setDocumentData] = useState(null);
  const [versions, setVersions] = useState([]);
  const [showVersions, setShowVersions] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [typingUser, setTypingUser] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("user"));

  const fetchDocument = async () => {
    try {
      const { data } = await API.get(`/documents/${id}`);
      setContent(data.content);
      setTitle(data.title);
      setDocumentData(data);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load document");
    }
  };

  const fetchVersions = async () => {
    try {
      const { data } = await API.get(`/documents/${id}/versions`);
      setVersions(data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    socket.emit("join-document", {
      documentId: id,
      userName: currentUser?.name || "Unknown User",
    });

    fetchDocument();
  }, [id]);

  useEffect(() => {
    socket.on("receive-changes", (newContent) => {
      setContent(newContent);
    });

    socket.on("active-users", (users) => {
      setActiveUsers(users);
    });

    socket.on("user-typing", (userName) => {
      setTypingUser(`${userName} is typing...`);

      setTimeout(() => {
        setTypingUser("");
      }, 1000);
    });

    return () => {
      socket.off("receive-changes");
      socket.off("active-users");
      socket.off("user-typing");
    };
  }, []);

  const handleChange = (value) => {
    setContent(value);

    socket.emit("send-changes", { documentId: id, content: value });
    socket.emit("typing", {
      documentId: id,
      userName: currentUser?.name || "Unknown User",
    });
  };

  const shareDocument = async () => {
    try {
      if (!shareEmail.trim()) {
        alert("Enter email");
        return;
      }

      const { data } = await API.post(`/documents/${id}/share`, {
        email: shareEmail,
        role: shareRole,
      });

      setDocumentData(data.document);
      setShareEmail("");
      alert("Document shared successfully");
    } catch (error) {
      alert(error.response?.data?.message || "Share failed");
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(title || "Untitled Document", 10, 10);

    const plainText = content.replace(/<[^>]+>/g, "");
    const lines = doc.splitTextToSize(plainText, 180);
    doc.text(lines, 10, 20);

    doc.save(`${title || "document"}.pdf`);
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await API.put(`/documents/${id}`, {
          title,
          content,
        });
      } catch (error) {
        console.log(error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [content, title, id]);

  const isOwner = documentData?.owner?._id === currentUser?.id;

  return (
    <div className="editor-container">
      <div className="editor-topbar">
        <button onClick={() => navigate("/dashboard")}>Back</button>
        <input
          type="text"
          className="editor-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Document Title"
        />
        <button
          onClick={() => {
            setShowVersions(!showVersions);
            fetchVersions();
          }}
        >
          Versions
        </button>
        <button onClick={exportPDF}>Export PDF</button>
      </div>

      <div className="active-users-box">
        <strong>Active Users:</strong> {activeUsers.join(", ")}
      </div>

      {typingUser && <div className="typing-box">{typingUser}</div>}

      {isOwner && (
        <div className="share-box">
          <input
            type="email"
            placeholder="Share with email"
            value={shareEmail}
            onChange={(e) => setShareEmail(e.target.value)}
          />
          <select value={shareRole} onChange={(e) => setShareRole(e.target.value)}>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button onClick={shareDocument}>Share</button>
        </div>
      )}

      {documentData && (
        <div className="collaborators-box">
          <h4>Collaborators</h4>
          <p><strong>Owner:</strong> {documentData.owner?.name} ({documentData.owner?.email})</p>
          {documentData.collaborators?.map((c, index) => (
            <p key={index}>
              {c.user?.name} ({c.user?.email}) - {c.role}
            </p>
          ))}
        </div>
      )}

      {showVersions && (
        <div className="versions-box">
          <h4>Version History</h4>
          {versions.length === 0 ? (
            <p>No versions yet</p>
          ) : (
            versions.map((v, index) => (
              <div key={index} className="version-item">
                <p>
                  {v.editedBy?.name || "Unknown"} - {new Date(v.editedAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      <ReactQuill theme="snow" value={content} onChange={handleChange} />
    </div>
  );
}

export default EditorPage;