import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";

function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const fetchDocuments = async () => {
    try {
      const { data } = await API.get("/documents");
      setDocuments(data);
    } catch (error) {
      console.log(error);
    }
  };

  const createDocument = async () => {
    try {
      const { data } = await API.post("/documents", {
        title: title || "Untitled Document",
      });
      navigate(`/document/${data._id}`);
    } catch (error) {
      console.log(error);
    }
  };

  const deleteDocument = async (id) => {
    try {
      const ok = window.confirm("Are you sure you want to delete this document?");
      if (!ok) return;

      await API.delete(`/documents/${id}`);
      fetchDocuments();
    } catch (error) {
      alert(error.response?.data?.message || "Delete failed");
    }
  };

  const searchDocuments = async (value) => {
    try {
      if (!value.trim()) {
        fetchDocuments();
        return;
      }

      const { data } = await API.get(`/documents/search/all?search=${value}`);
      setDocuments(data);
    } catch (error) {
      console.log(error);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchDocuments(search);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>My Documents</h2>
        <button onClick={logout}>Logout</button>
      </div>

      <div className="create-doc-box">
        <input
          type="text"
          placeholder="Enter document title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button onClick={createDocument}>Create Document</button>
      </div>

      <div className="search-box">
        <input
          type="text"
          placeholder="Search documents"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="documents-list">
        {documents.map((doc) => (
          <div key={doc._id} className="document-card">
            <div onClick={() => navigate(`/document/${doc._id}`)} style={{ cursor: "pointer" }}>
              <h3>{doc.title}</h3>
              <p>Owner: {doc.owner?.name || "Unknown"}</p>
              <p>{new Date(doc.updatedAt).toLocaleString()}</p>
            </div>

            <div className="doc-card-actions">
              <button onClick={() => navigate(`/document/${doc._id}`)}>Open</button>
              <button onClick={() => deleteDocument(doc._id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;