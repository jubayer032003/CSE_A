import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import socket from "../socket";

const NoteManager = () => {
  const { user } = useContext(AuthContext);

  const [notes, setNotes] = useState([]);
  const [form, setForm] = useState({
    year: "1st",
    semester: "1st",
    course: "",
    driveLink: "",
    teacher: "",
  });

  const fetchNotes = async () => {
    const { data } = await axios.get("/api/notes");
    setNotes(data);
  };

  useEffect(() => {
    (async () => {
      await fetchNotes();
    })();
    socket.on("notes-updated", fetchNotes);
    return () => socket.off("notes-updated");
  }, []);

  const addNote = async () => {
    await axios.post("/api/notes", form, {
      headers: { Authorization: `Bearer ${user.token}` },
    });

    setForm({ year: "1st", semester: "1st", course: "", driveLink: "", teacher: "" });
  };

  const deleteNote = async (id) => {
    await axios.delete(`/api/notes/${id}`, {
      headers: { Authorization: `Bearer ${user.token}` },
    });
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Note Manager</h2>

      {/* Form */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <select onChange={(e) => setForm({ ...form, year: e.target.value })}>
          <option value="1st">1st Year</option>
          <option value="2nd">2nd Year</option>
          <option value="3rd">3rd Year</option>
          <option value="4th">4th Year</option>
        </select>

        <select onChange={(e) => setForm({ ...form, semester: e.target.value })}>
          <option value="1st">1st Semester</option>
          <option value="2nd">2nd Semester</option>
          <option value="3rd">3rd Semester</option>
        </select>

        <input
          placeholder="Course"
          onChange={(e) => setForm({ ...form, course: e.target.value })}
        />

        <input
          placeholder="Drive Link"
          onChange={(e) => setForm({ ...form, driveLink: e.target.value })}
        />

        <input
          placeholder="Teacher"
          onChange={(e) => setForm({ ...form, teacher: e.target.value })}
        />
      </div>

      <button onClick={addNote} className="bg-blue-600 text-white px-3 py-1">
        Add Note
      </button>

      {/* Table */}
      <table className="w-full border mt-4">
        <thead>
          <tr>
            <th>Year</th>
            <th>Semester</th>
            <th>Course</th>
            <th>Teacher</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {notes.map((n) => (
            <tr key={n._id}>
              <td>{n.year}</td>
              <td>{n.semester}</td>
              <td>{n.course}</td>
              <td>{n.teacher}</td>
              <td>
                <button
                  onClick={() => deleteNote(n._id)}
                  className="text-red-500"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default NoteManager;
