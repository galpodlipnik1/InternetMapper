import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

const agent = new https.Agent({
  rejectUnauthorized: false
});

export const crawlLinks = async (url, baseUrl, depth, visited, parent, originalDepth = depth) => {
  if (visited.has(url) || depth === 0) {
    return [];
  }

  visited.set(url, true);

  let response;
  try {
    response = await axios.get(url, { httpsAgent: agent });
  } catch (error) {
    return [];
  }

  if (response.status !== 200) {
    return [];
  }

  const html = response.data;
  const $ = cheerio.load(html);
  let links = $('a').map((_, element) => $(element).attr('href')).get();

  let formattedLinks = formatLinks(links, baseUrl);

  const childLinks = await Promise.all(formattedLinks.map(link => crawlLinks(link, baseUrl, depth - 1, visited, url, originalDepth)));
  
  const flattenedChildLinks = childLinks.flat();

  return [{url: url, links: formattedLinks, parent: parent, crawlDepth: (originalDepth - depth) + 1}, ...flattenedChildLinks];
};

export const formatLinks = (links, baseUrl) => {
  let uniqueLinks = new Set();
  let baseOrigin;
  try {
    baseOrigin = new URL(baseUrl).origin;
  } catch (error) {
    return [];
  }
  return links
    .map((link) => {
      if (!link.startsWith('http')) {
        link = link.startsWith('/') ? baseUrl + link : baseUrl + '/' + link;
      }
      try {
        const url = new URL(link);
        const baseLink = url.origin;
        return baseLink;
      } catch (error) {
        return null;
      }
    })
    .filter(link => link && link !== baseOrigin)
    .filter((baseLink) => {
      if (baseLink && !uniqueLinks.has(baseLink)) {
        uniqueLinks.add(baseLink);
        return true;
      }
      return false;
    });
}

export const changeLinks = (linksArr, baseUrl) => {
  const seen = []; // Declare seen outside of the map function
  const changed = linksArr.map(linkObj => {
    const links = linkObj.links;
    const url = linkObj.url;
    if (!links) {
      return linkObj;
    }
    const filteredLinks = links.map(link => link.replace(/^www\./, '')).filter(link => !(link.includes(baseUrl) || (link.includes(url) && url !== baseUrl)));
    const uniqueLinks = filteredLinks.filter(link => {
      if (seen.includes(link)) {
        return false;
      }
      seen.push(link);
      return true;
    });
    return {...linkObj, links: uniqueLinks};
  });

  return changed;
};