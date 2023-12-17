import axios from 'axios';
import * as cheerio from 'cheerio';
import { formatLinks, removeDuplicates } from '../utils/links.js';
import https from 'https';

export const getLinks = async (_, res) => {
  const baseUrl = "https://cheerio.js.org/"
  try {
    let links = await crawlLinks(baseUrl, baseUrl, 3, new Map());
    links = removeDuplicates(links);
    res.status(200).json({ status: 200, links: links });
  } catch (error) {
    console.log(error);
    res.status(404).json({ status: 404, message: error.message });
  }
};

const crawlLinks = async (url, baseUrl, depth, visited) => {
  if (visited.has(url) || depth === 0) {
    return [];
  }

  visited.set(url, true);

  let response;
  try {
    response = await axios.get(url, {
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });
    if (response.status !== 200) {
      return [];
    }
  } catch (error) {
    return [];
  }

  const html = response.data;
  const $ = cheerio.load(html);
  const links = $('a').map((_, element) => $(element).attr('href')).get();

  const formattedLinks = formatLinks(links, baseUrl);

  const childLinks = await Promise.all(formattedLinks.map(link => crawlLinks(link, baseUrl, depth - 1, visited)));
  
  return [url, ...childLinks.flatMap(x => x)];
};