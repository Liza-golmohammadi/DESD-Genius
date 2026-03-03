import {
  createContext,
  useState,
  useMemo,
  useEffect,
  useCallback,
} from "react";
import { useNavigate } from "react-router";
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
  loading: boolean;
  setUser: React.Dispatch<React.SetStateAction<User | null>>; // set user
  loginUser: (payload: LoginPayload) => Promise<void>;
  registerUser: (payload: RegisterPayload) => Promise<void>;
  logoutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
export default AuthContext;

export const AuthProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [authTokens, setAuthTokens] = useState<AuthTokens | null>(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const logoutUser = useCallback(async () => {
    try {
      const refresh = localStorage.getItem("refresh");
      if (refresh) {
        await api.post("/api/auth/logout/", { refresh });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      setAuthTokens(null);
      setUser(null);
    }
  }, []);

  const loginUser = useCallback(
    async ({ email, password }: LoginPayload) => {
      const token = await api.post<AuthTokens>("/api/auth/login/", { email, password });
      localStorage.setItem("access", token.data.access);
      localStorage.setItem("refresh", token.data.refresh);
      setAuthTokens(token.data);

      const res = await api.get<User>("/api/auth/user/");
      setUser(res.data);

      if (res.data.role === "producer") {
        navigate("/producer/dashboard");
      } else {
        navigate("/");
      }
    },
    [navigate],
  );

  useEffect(() => {
    const auth = async () => {
      const access = localStorage.getItem("access");
      const refresh = localStorage.getItem("refresh");

      if (!access || !refresh) {
        setLoading(false);
        return;
      }
      setAuthTokens({ access, refresh });
      try {
        const res = await api.get<User>("/api/auth/user/");
        setUser(res.data);
      } catch {
        logoutUser();
      } finally {
        setLoading(false);
      }
    };
    auth();
  }, []);

  const registerUser = useCallback(
    async (payload: RegisterPayload) => {
      await api.post("/api/auth/register/", payload);
      await loginUser({
        email: payload.email,
        password: payload.password,
      });
    },
    [loginUser],
  );

  const contextData = useMemo(
    () => ({ user, authTokens, loading, setUser, loginUser, registerUser, logoutUser }),
    [user, authTokens, loading, loginUser, registerUser, logoutUser],
  );
  return (
    <AuthContext.Provider value={contextData}>{children}</AuthContext.Provider>
  );
};
