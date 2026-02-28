import { useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";

const AddNotice = () => {
  const { user } = useContext(AuthContext);

  const [form, setForm] = useState({
    title: "",
    content: "",
  });

  const addNotice = async () => {
    try {
      await axios.post("/api/notices", form, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      alert("Notice added");
      setForm({ title: "", content: "" });
    } catch {
      alert("Error adding notice");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Add Notice</h2>

      <input
        placeholder="Title"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
      />

      <textarea
        placeholder="Content"
        value={form.content}
        onChange={(e) => setForm({ ...form, content: e.target.value })}
      />

      <button onClick={addNotice}>Add Notice</button>
    </div>
  );
};

export default AddNotice;
