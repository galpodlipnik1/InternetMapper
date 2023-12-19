import * as api from '../api';

export const getLinks = async () => {
  try {
    const { data } = await api.getLinks();

    return data.links;
  } catch (error: any) {
    console.log(error.message);
  }
};
