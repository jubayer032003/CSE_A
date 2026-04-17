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
    const { data } = await axios.get("/api/notices");
    setNotices(data);
  };

  useEffect(() => {
    const loadNotices = async () => {
      const { data } = await axios.get("/api/notices");
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
        `/api/notices/${editing}`,
        form,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
    } else {
      await axios.post(
        "/api/notices",
        form,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
    }

    setModalOpen(false);
    fetchNotices();
  };

  const deleteNotice = async (id) => {
    await axios.delete(`/api/notices/${id}`, {
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
        <div className="fixed inset-0 z-50 flex min-h-[100dvh] items-end justify-center overflow-y-auto overscroll-contain bg-black/50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:items-center sm:p-4">
          <div className="w-full max-w-md max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-t-2xl rounded-b-xl bg-white p-4 shadow-lg sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl sm:p-6">
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
              className="min-h-32 border w-full p-2"
              placeholder="Content"
              value={form.content}
              onChange={(e) =>
                setForm({ ...form, content: e.target.value })
              }
            />

            <div className="sticky bottom-0 -mx-4 mt-4 flex flex-col-reverse justify-end gap-2 border-t border-slate-200 bg-white px-4 pb-1 pt-4 sm:static sm:mx-0 sm:flex-row sm:border-0 sm:p-0">
              <button
                onClick={() => setModalOpen(false)}
                className="min-h-11 w-full px-3 py-2 sm:w-auto"
              >
                Cancel
              </button>

              <button
                onClick={saveNotice}
                className="min-h-11 w-full rounded bg-blue-600 px-3 py-2 text-white sm:w-auto"
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
