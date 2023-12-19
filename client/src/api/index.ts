import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5001/' });

export const getLinks = () => API.get('/links');
export const addLink = (url: string, depth: number) =>
  API.get(`/links/link?url=${url}&depth=${depth}`);
