import { createContext, useState, useMemo, useEffect } from "react";
import api from "../api";

interface RegisterPayload {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role: "customer" | "producer";
}

interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  is_active?: boolean;
}

interface AuthTokens {
  access: string;
  refresh: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  authTokens: AuthTokens | null;
  loginUser: (payload: LoginPayload) => Promise<void>;
  registerUser: (payload: RegisterPayload) => Promise<void>;
  logoutUser: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
export default AuthContext;

export const AuthProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [authTokens, setAuthTokens] = useState<AuthTokens | null>(null);

  const registerUser = async (payload: RegisterPayload) => {
    await api.post("/api/auth/register/", payload);
    //auto login?
    /* 
      await loginUser({
      email: payload.email,
      password: payload.password
    }) 
    */
  };

  const loginUser = async ({ email, password }: LoginPayload) => {
    const token = await api.post<AuthTokens>("/api/token/", {
      email,
      password,
    });
    localStorage.setItem("access", token.data.access);
    localStorage.setItem("refresh", token.data.refresh);
    setAuthTokens(token.data);

    await fetchCurrentUser();
  };

  const fetchCurrentUser = async () => {
    const res = await api.get<User>("/api/auth/user/");
    setUser(res.data);
  };

  useEffect(() => {
    const auth = async () => {
      const access = localStorage.getItem("access");
      const refresh = localStorage.getItem("refresh");

      if (!access || !refresh) {
        return;
      }
      setAuthTokens({ access, refresh });
      try {
        await fetchCurrentUser();
      } catch {
        logoutUser();
      } 
    };
    auth();
  }, []);

  const logoutUser = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setAuthTokens(null);
    setUser(null);
  };
  const contextData = useMemo(
    () => ({ user, authTokens, loginUser, registerUser, logoutUser }),
    [user, authTokens, loginUser, registerUser, logoutUser],
  );
  return (
    <AuthContext.Provider value={contextData}>{children}</AuthContext.Provider>
  );
};
