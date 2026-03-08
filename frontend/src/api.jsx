import axios from "axios";

// Create an Axios instance for all API calls
const API = axios.create({
  baseURL: "http://localhost:5001/api", // Base URL for backend
});

export default API;
