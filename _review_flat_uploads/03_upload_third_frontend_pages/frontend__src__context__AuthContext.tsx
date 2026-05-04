import {
  createContext,
  useState,
  useMemo,
  useEffect,
  useCallback,
} from "react";
import { useNavigate } from "react-router";
import api from "../api";

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
  postcode?: string;
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
      const refresh = localStorage.getItem("refresh");
      if (refresh) {
        await api.post("/accounts/auth/logout/", { refresh });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      setUser(null);
    }
  }, []);

  const loginUser = useCallback(
    async ({ email, password }: LoginPayload) => {
      const token = await api.post("/accounts/token/", { email, password });
      localStorage.setItem("access", token.data.access);
      localStorage.setItem("refresh", token.data.refresh);

      const res = await api.get<User>("/accounts/auth/me/");
      setUser(res.data);
      console.log(res.data)
      if (res.data.producer_profile) {
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
      try {
        const res = await api.get<User>("/accounts/auth/me/");
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
    await api.post("/accounts/auth/register/customer/", payload);
    await loginUser({
      email: payload.email,
      password: payload.password,
    });
  },
  [loginUser],
);

const registerProducer = useCallback(
  async (payload: RegisterProducerPayload) => {
    await api.post("/accounts/auth/register/producer/", payload);
    await loginUser({
      email: payload.email,
      password: payload.password,
    });

    // 3. Update producer profile (signal creates it, we just update it)
    /* await api.patch("/accounts/auth/me/", {
      producer_profile: {
        store_name: payload.store_name,
        store_description: payload.store_description,
        store_contact: payload.store_contact,
      },
    }); */
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
