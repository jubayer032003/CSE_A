import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";

const NoticeManager = () => {
  const { user } = useContext(AuthContext);

  const [notices, setNotices] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", content: "" });

  const fetchNotices = async () => {
    const { data } = await axios.get("http://localhost:5000/api/notices");
    setNotices(data);
  };

  useEffect(() => {
    const loadNotices = async () => {
      const { data } = await axios.get("http://localhost:5000/api/notices");
      setNotices(data);
    };
    loadNotices();
  }, []);

  const openAddModal = () => {
    setForm({ title: "", content: "" });
    setEditing(null);
    setModalOpen(true);
  };

  const openEditModal = (notice) => {
    setForm({ title: notice.title, content: notice.content });
    setEditing(notice._id);
    setModalOpen(true);
  };

  const saveNotice = async () => {
    if (editing) {
      await axios.put(
        `http://localhost:5000/api/notices/${editing}`,
        form,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
    } else {
      await axios.post(
        "http://localhost:5000/api/notices",
        form,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
    }

    setModalOpen(false);
    fetchNotices();
  };

  const deleteNotice = async (id) => {
    await axios.delete(`http://localhost:5000/api/notices/${id}`, {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    fetchNotices();
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Notice Manager</h2>

      <button
        onClick={openAddModal}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Add Notice
      </button>

      <div className="mt-6">
        {notices.map((notice) => (
          <div key={notice._id} className="border p-3 rounded mb-2">
            <h3 className="font-semibold">{notice.title}</h3>
            <p>{notice.content}</p>

            <div className="mt-2 space-x-2">
              <button
                onClick={() => openEditModal(notice)}
                className="bg-green-500 text-white px-3 py-1 rounded"
              >
                Edit
              </button>

              <button
                onClick={() => deleteNotice(notice._id)}
                className="bg-red-500 text-white px-3 py-1 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-xl mb-4">
              {editing ? "Edit Notice" : "Add Notice"}
            </h2>

            <input
              className="border w-full p-2 mb-2"
              placeholder="Title"
              value={form.title}
              onChange={(e) =>
                setForm({ ...form, title: e.target.value })
              }
            />

            <textarea
              className="border w-full p-2"
              placeholder="Content"
              value={form.content}
              onChange={(e) =>
                setForm({ ...form, content: e.target.value })
              }
            />

            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-3 py-1"
              >
                Cancel
              </button>

              <button
                onClick={saveNotice}
                className="bg-blue-600 text-white px-3 py-1 rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoticeManager;