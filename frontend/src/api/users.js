import apiClient from "./client";
import { endpoints } from "./endpoints";

const base = endpoints.users; // '/users/'

export const fetchMeStatus = () => apiClient.get(`${base}me/status/`);

export const fetchCompleteProfile = () => apiClient.get(`${base}me/complete-profile/`);

export const patchCompleteProfile = (payload) =>
  apiClient.patch(`${base}me/complete-profile/`, payload);

export const uploadAvatar = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return apiClient.post(`${base}me/upload-avatar/`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};