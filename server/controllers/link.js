import { changeLinks, crawlLinks } from '../utils/links.js';
import Link from '../model/link.js';

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
    res.status(200).json({ links });
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