import API from "./apiClient";

export const login = async (email, password) => {
  const response = await API.post("/auth/login", { email, password });
  return response.data;
};

export const signup = async (name, email, password) => {
  const response = await API.post("/auth/signup", { name, email, password });
  return response.data;
};

export const getProfile = async () => (await API.get("/auth/me")).data;
export const updateProfile = async (data) => (await API.patch("/auth/me", data)).data;
