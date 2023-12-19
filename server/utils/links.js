import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

const agent = new https.Agent({
  rejectUnauthorized: false
});

agent.setMaxListeners(50);

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
  const seen = []; 
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

export const formatResponse = (linksArr) => {
  
  let groupedLinks = {};

  linksArr.forEach(link => {
    
    let parentUrl = link.parent;

    if (!groupedLinks[parentUrl]) {
      groupedLinks[parentUrl] = [];
    }

    groupedLinks[parentUrl].push({
      url: link.url,
      depth: link.crawlDepth,
      color: getColor(link.crawlDepth),
      size: getSize(link.crawlDepth),
      lineWidth: getLineWidth(link.crawlDepth),
      links: link.links,
      parent: parentUrl // add parent field
    });
  });

  let formattedResponse = Object.keys(groupedLinks).map(parentUrl => {
    return {
      parent: parentUrl,
      links: groupedLinks[parentUrl]
    };
  });

  return formattedResponse;
};


const getColor = (depth) => {
  const seededRandom = (seed) => Math.sin(seed) * 10000 - Math.floor(Math.sin(seed) * 10000);

  const r = Math.floor(seededRandom(depth + 1) * 256);
  const g = Math.floor(seededRandom(depth + 2) * 256);
  const b = Math.floor(seededRandom(depth + 3) * 256);

  return `rgb(${r}, ${g}, ${b})`;
}

const getSize = (depth) => {
  return 1 / Math.pow(2, depth - 1);
}

const getLineWidth = (depth) => {
  return 3 / Math.pow(2, depth);
}