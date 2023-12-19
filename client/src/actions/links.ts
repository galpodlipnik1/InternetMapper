import * as api from '../api';

export const getLinks = async () => {
  try {
    const { data } = await api.getLinks();

    return data.map;
  } catch (error: any) {
    console.log(error.message);
  }
};
