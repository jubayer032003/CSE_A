import { useState } from "react";
import { AuthContext } from "./AuthContext";

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("userInfo");
    if (!storedUser || storedUser === "undefined" || storedUser === "null") {
      return null;
    }

    try {
      const parsed = JSON.parse(storedUser);
      if (parsed?.user && parsed?.token && !parsed?.role) {
        return { ...parsed.user, token: parsed.token };
      }
      return parsed;
    } catch {
      localStorage.removeItem("userInfo");
      return null;
    }
  });

  const login = (data) => {
    if (!data) {
      localStorage.removeItem("userInfo");
      setUser(null);
      return;
    }

    const userWithLoginTime = {
      ...data,
      loginAt: data.loginAt || new Date().toISOString(),
    };

    localStorage.setItem("userInfo", JSON.stringify(userWithLoginTime));
    setUser(userWithLoginTime);
  };

  const logout = () => {
    localStorage.removeItem("userInfo");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
