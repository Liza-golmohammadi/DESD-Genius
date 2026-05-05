import {
  createContext,
  useState,
  useMemo,
  useEffect,
  useCallback,
} from "react";
import { useNavigate } from "react-router";
import api from "../utils/api";

interface RegisterCustomerPayload {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  customer_role: string;
  accepted_terms: boolean;
}

interface RegisterProducerPayload {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  store_name: string;
  store_description?: string;
  store_contact?: string;
  accepted_terms: boolean;
}

interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  customer_role?: string;
  is_producer?: boolean;
  accepted_terms_at?: string;
  producer_profile?: {
    store_name: string;
    store_description: string;
    store_contact: string;
    store_created_at: string;
  } | null;
}


interface LoginPayload {
  email: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: React.Dispatch<React.SetStateAction<User | null>>; // set user
  loginUser: (payload: LoginPayload) => Promise<void>;
  registerCustomer: (payload: RegisterCustomerPayload) => Promise<void>;
  registerProducer: (payload: RegisterProducerPayload) => Promise<void>;
  logoutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
export default AuthContext;

export const AuthProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const logoutUser = useCallback(async () => {
    try {
      // Server reads refresh from HTTP-only cookie, blacklists it, clears cookie
      await api.post("/api/auth_service/logout/", {});
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("access");
      setUser(null);
    }
  }, []);

  const loginUser = useCallback(
    async ({ email, password }: LoginPayload) => {
      // Server sets refresh token as HTTP-only cookie, returns access in body
      const token = await api.post("/api/auth_service/token/", { email, password });
      localStorage.setItem("access", token.data.access);
      // Note: refresh token is NOT in the response body — it's in a Set-Cookie header

      const res = await api.get<User>("/api/auth_service/me/");
      setUser(res.data);
      if (res.data.producer_profile) {
        navigate("/producer/dashboard");
      } else {
        navigate("/");
      }
    },
    [navigate],
  );

  useEffect(() => {
    // Clean up stale refresh token from old localStorage approach
    localStorage.removeItem("refresh");

    const auth = async () => {
      const access = localStorage.getItem("access");

      if (!access) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get<User>("/api/auth_service/me/");
        setUser(res.data);
      } catch {
        logoutUser();
      } finally {
        setLoading(false);
      }
    };
    auth();
  }, []);

  const registerCustomer = useCallback(
  async (payload: RegisterCustomerPayload) => {
    await api.post("/api/auth_service/register/customer/", payload);
    await loginUser({
      email: payload.email,
      password: payload.password,
    });
  },
  [loginUser],
);

const registerProducer = useCallback(
  async (payload: RegisterProducerPayload) => {
    await api.post("/api/auth_service/register/producer/", payload);
    await loginUser({
      email: payload.email,
      password: payload.password,
    });
  },
  [loginUser],
);

  const contextData = useMemo(
    () => ({ user, loading, setUser, loginUser, registerCustomer, registerProducer, logoutUser }),
    [user, loading, loginUser, registerCustomer, registerProducer, logoutUser],
  );
  return (
    <AuthContext.Provider value={contextData}>{children}</AuthContext.Provider>
  );
};