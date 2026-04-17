/** @format */

import { emitApiToast } from "@/components/toast/hook";
import axios, { type AxiosRequestConfig } from "axios";

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
      return Promise.reject(error);
    }

    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "Có lỗi xảy ra khi gọi API";

    emitApiToast({
      type: "error",
      title: "API Error",
      description: errorMessage,
    });
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
  getProducts: (id: string, countOnly = false) =>
    api.get(`/shops/${id}/products`, {
      params: { count: countOnly || undefined },
    }),
  resetProductStatus: (id: string) =>
    api.post(`/shops/${id}/reset-product-status`),
};

// Products APIs
export const productsAPI = {
  list: (page = 1, limit = 10, search?: string, filters?: any) =>
    api.get("/products", { params: { page, limit, search, ...filters } }),
  get: (id: string) => api.get(`/products/${id}`),
  getPriceHistory: (id: string, limit = 100) =>
    api.get(`/products/${id}/price-history`, { params: { limit } }),
  create: (data: any) => api.post("/products", data),
  syncFromLink: (link: string) =>
    api.post("/products/sync-from-link", { link }),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  import: (file: File, config?: AxiosRequestConfig) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/products/import", formData, {
      ...config,
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  export: (config?: AxiosRequestConfig) =>
    api.get("/products/export", { responseType: "blob", ...config }),
};

// Crawl History APIs
export const crawlHistoryAPI = {
  list: (page = 1, limit = 10) =>
    api.get("/crawl-history", { params: { page, limit } }),
  get: (id: string) => api.get(`/crawl-history/${id}`),
};

// Dashboard APIs
export const dashboardAPI = {
  getOverview: () => api.get("/dashboard/overview"),
};

// Account Settings APIs
export const accountSettingsAPI = {
  list: (page = 1, limit = 20, search?: string, platform?: string) =>
    api.get("/account-settings", { params: { page, limit, search, platform } }),
  get: (id: string) => api.get(`/account-settings/${id}`),
  create: (data: any) => api.post("/account-settings", data),
  update: (id: string, data: any) => api.put(`/account-settings/${id}`, data),
  delete: (id: string) => api.delete(`/account-settings/${id}`),
};

// Post Schedules APIs
export const postSchedulesAPI = {
  list: (page = 1, limit = 20, search?: string, status?: string) =>
    api.get("/post-schedules", { params: { page, limit, search, status } }),
  get: (id: string) => api.get(`/post-schedules/${id}`),
  create: (data: any) => api.post("/post-schedules", data),
  update: (id: string, data: any) => api.put(`/post-schedules/${id}`, data),
  delete: (id: string) => api.delete(`/post-schedules/${id}`),
  processDue: () => api.post("/post-schedules/process-due"),
  processNow: (id: string) => api.post(`/post-schedules/${id}/process`),
};

// Master Data - Brands APIs
export const brandsAPI = {
  list: (page = 1, limit = 20, search?: string, active?: boolean | undefined) =>
    api.get("/master-data/brands", { params: { page, limit, search, active } }),
  get: (id: string) => api.get(`/master-data/brands/${id}`),
  create: (data: any) => api.post("/master-data/brands", data),
  update: (id: string, data: any) => api.put(`/master-data/brands/${id}`, data),
  delete: (id: string) => api.delete(`/master-data/brands/${id}`),
};
