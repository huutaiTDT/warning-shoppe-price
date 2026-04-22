/** @format */

import { emitApiToast } from "@/components/toast/hook";
import { clearStoredAuthSession, getStoredAuthToken } from "@/lib/auth";
import axios, { type AxiosRequestConfig } from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://warning-price-api.gitlabserver.id.vn";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token if needed
api.interceptors.request.use(
  (config) => {
    const token = getStoredAuthToken();
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
      clearStoredAuthSession();
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
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post("/auth/change-password", { currentPassword, newPassword }),
  getCurrentUser: () => api.get("/auth/me"),
};

// Shops APIs
export const shopsAPI = {
  list: (page = 1, limit = 10, search?: string) =>
    api.get("/master-data/shops", { params: { page, limit, search } }),
  get: (id: string) => api.get(`/master-data/shops/${id}`),
  create: (data: any) => api.post("/master-data/shops", data),
  update: (id: string, data: any) => api.put(`/master-data/shops/${id}`, data),
  delete: (id: string) => api.delete(`/master-data/shops/${id}`),
  crawl: (id: string) => api.post(`/master-data/shops/${id}/crawl`),
  getProducts: (id: string, page = 1, limit = 10, search = "", brand = "") =>
    api.get(`/master-data/shops/${id}/products`, {
      params: {
        page,
        limit,
        search: search || undefined,
        brand: brand || undefined,
      },
    }),
  resetProductStatus: (id: string) =>
    api.post(`/master-data/shops/${id}/reset-product-status`),
};

// Products APIs
export const productsAPI = {
  list: (page = 1, limit = 10, search?: string, filters?: any) =>
    api.get("/products", { params: { page, limit, search, ...filters } }),
  countUnderOriginal: (filters?: any) =>
    api.get("/products/under-original-count", { params: { ...filters } }),
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

// Accounts Management APIs
export const accountsAPI = {
  list: (page = 1, limit = 20) =>
    api.get("/accounts", { params: { page, limit } }),
  getAll: () =>
    api.get("/accounts").then((res) => res.data.items || res.data || []),
  get: (id: string) => api.get(`/accounts/${id}`),
  create: (data: any) => api.post("/accounts", data),
  update: (id: string, data: any) => api.put(`/accounts/${id}`, data),
  delete: (id: string) => api.delete(`/accounts/${id}`),
  getAssignedShops: () => api.get("/accounts/shops"),
  // Brand management for accounts
  getBrands: (accountId: string) => api.get(`/accounts/${accountId}/brands`),
  assignBrands: (accountId: string, brandIds: string[]) =>
    api.post(`/accounts/${accountId}/brands`, { brand_ids: brandIds }),
  removeBrand: (accountId: string, brandId: string) =>
    api.delete(`/accounts/${accountId}/brands/${brandId}`),
};

// Master Data - Brands APIs
export const brandsAPI = {
  list: (page = 1, limit = 20, search?: string, active?: boolean | undefined) =>
    api.get("/master-data/brands", { params: { page, limit, search, active } }),
  get: (id: string) => api.get(`/master-data/brands/${id}`),
  create: (data: any) => api.post("/master-data/brands", data),
  update: (id: string, data: any) => api.put(`/master-data/brands/${id}`, data),
  delete: (id: string) => api.delete(`/master-data/brands/${id}`),
  selectBox: () => api.get("/master-data/brands/select-box"),
};

export const masterProductsAPI = {
  list: (page = 1, limit = 20, filters?: any) =>
    api.get("/master-data/products", { params: { page, limit, ...filters } }),
  get: (id: string) => api.get(`/master-data/products/${id}`),
  create: (data: any) => api.post("/master-data/products", data),
  update: (id: string, data: any) =>
    api.put(`/master-data/products/${id}`, data),
  delete: (id: string) => api.delete(`/master-data/products/${id}`),
  import: (file: File, config?: AxiosRequestConfig) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/master-data/products/import", formData, {
      ...config,
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  export: (config?: AxiosRequestConfig) =>
    api.get("/master-data/products/export/xlsx", {
      responseType: "blob",
      ...config,
    }),
  downloadTemplate: (config?: AxiosRequestConfig) =>
    api.get("/master-data/products/template/download", {
      responseType: "blob",
      ...config,
    }),
  comparePrice: () => api.get("/master-data/products/compare/price"),
  getWarning: (id: string) =>
    api.get(`/master-data/products/${id}/get-warning`),
};

export const userBrandPermissionsAPI = {
  list: () => api.get("/master-data/user-brand-permissions"),
  create: (data: { user_id: string; brand_id: string }) =>
    api.post("/master-data/user-brand-permissions", data),
  delete: (id: string) =>
    api.delete(`/master-data/user-brand-permissions/${id}`),
};
