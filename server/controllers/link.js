import { changeLinks, crawlLinks, formatResponse } from '../utils/links.js';
import Link from '../model/link.js';
import axios from 'axios';

export const getLinks = async (req, res) => {
  const baseUrl = `https://${req.query.url}`;
  const crawlDepth = req.query.depth;

  try {
    let links = await crawlLinks(baseUrl, baseUrl, crawlDepth, new Map(), baseUrl);
    links = changeLinks(links, baseUrl);
    links = links.flat(Infinity);
    const linkLength = links.length;
    for (let link of links) {
      const existingLink = await Link.findOne({ url: link.url });
      if (!existingLink) {
        const newLink = new Link({
          url: link.url,
          links: link.links,
          parent: link.parent,
          crawlTime: new Date(),
          crawlDepth: link.crawlDepth
        });
        await newLink.save();
      }
    }

    res.status(200).json({ message: `${linkLength} links crawled` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

export const getKnownLinks = async (_, res) => {
  try {
    const links = await Link.find({});

    res.status(200).json({ map: formatResponse(links) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const purgeModel = async (req, res) => {
  try {
    await Link.deleteMany({});
    res.status(200).json({ status: 200, message: 'Links purged' });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
}

export const test = async (req, res) => {
  const randomWebsites = [
    'google.com',
    'youtube.com',
    'facebook.com',
    'wikipedia.org',
    'reddit.com',
    'yahoo.com',
    'amazon.com',
    'twitter.com',
    'live.com',
    'instagram.com',
    'linkedin.com',
    'netflix.com',
    'wordpress.com',
    'ebay.com',
    'apple.com',
    'imgur.com',
    'microsoft.com',
    'pinterest.com',
    'paypal.com',
    'espn.com',
    'tumblr.com',
    'bing.com',
    'office.com',
    'github.com',
    'stackoverflow.com',
    'quora.com',
    'adobe.com',
    'whatsapp.com',
    'blogger.com',
    'spotify.com',
    'yelp.com',
  ]

  try {
    randomWebsites.forEach(async (website) => {
      const add = await axios.get(`http://localhost:5001/links/link/?url=${website}/&depth=3`);
      console.log(add.data.message + ' for ' + website);
    });

    res.status(200).json({ message: 'WORKING...' });
    console.log('DONE');
  } catch (error) {
    console.log(error);
  }
};