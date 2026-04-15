/** @format */

import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token if needed
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor for auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export const apiClient = api;

// Auth APIs
export const authAPI = {
  login: (username: string, password: string) =>
    api.post("/auth/login", { username, password }),
  logout: () => api.post("/auth/logout"),
};

// Shops APIs
export const shopsAPI = {
  list: (page = 1, limit = 10, search?: string) =>
    api.get("/shops", { params: { page, limit, search } }),
  get: (id: string) => api.get(`/shops/${id}`),
  create: (data: any) => api.post("/shops", data),
  update: (id: string, data: any) => api.put(`/shops/${id}`, data),
  delete: (id: string) => api.delete(`/shops/${id}`),
  crawl: (id: string) => api.post(`/shops/${id}/crawl`),
  getProducts: (id: string) => api.get(`/shops/${id}/products`),
  resetProductStatus: (id: string) =>
    api.post(`/shops/${id}/reset-product-status`),
};

// Products APIs
export const productsAPI = {
  list: (page = 1, limit = 10, search?: string, filters?: any) =>
    api.get("/products", { params: { page, limit, search, ...filters } }),
  get: (id: string) => api.get(`/products/${id}`),
  create: (data: any) => api.post("/products", data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  import: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/products/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  export: () => api.get("/products/export", { responseType: "blob" }),
};

// Crawl History APIs
export const crawlHistoryAPI = {
  list: (page = 1, limit = 10) =>
    api.get("/crawl-history", { params: { page, limit } }),
  get: (id: string) => api.get(`/crawl-history/${id}`),
};
