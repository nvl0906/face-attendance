import axios from "axios";
import * as SecureStore from 'expo-secure-store';

const BACKEND_URL = "https://api.tmiattendance.dpdns.org";

const api = axios.create({
  baseURL: BACKEND_URL,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // If data is FormData, let Axios set the Content-Type automatically
  if (config.data instanceof FormData) {
    config.headers['Content-Type'] = 'multipart/form-data';
  }
  return config;
});

export default api;
