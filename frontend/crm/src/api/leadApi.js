import API from "./apiClient";

export { API };

export const getLeads = async (
  search = "",
  status = "",
  page = 1,
  limit = 5,
  { signal } = {}
) => {
  const response = await API.get("/leads", {
    params: { search, status, page, limit },
    signal,
  });

  return response.data;
};

export const getStats = async () => {
  const response = await API.get("/leads/stats");
  return response.data;
};

export const getLeadTrends = async (period) => {
  const response = await API.get("/leads/trends", { params: { period } });
  return response.data;
};

export const createLead = async (leadData) => {
  const response = await API.post("/leads", leadData);
  return response.data;
};

export const getLeadById = async (id, { signal } = {}) => {
  const response = await API.get(`/leads/${id}`, { signal });
  return response.data;
};

export const updateLead = async (id, leadData) => {
  const response = await API.put(`/leads/${id}`, leadData);
  return response.data;
};

export const deleteLead = async (id) => {
  const response = await API.delete(`/leads/${id}`);
  return response.data;
};
