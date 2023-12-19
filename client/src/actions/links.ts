import * as api from '../api';

export const getLinks = async () => {
  try {
    const { data } = await api.getLinks();

    return data.map;
  } catch (error: any) {
    console.log(error.message);
  }
};

export const createLink = async (url: string, depth: number) => {
  try {
    const { data } = await api.addLink(url, depth);

    return data;
  } catch (error: any) {
    console.log(error.message);
  }
};
