export const formatLinks = (links, baseUrl) => {
  let uniqueLinks = [];
  return links
    .filter(link => link)
    .map((link) => {
      if (!link.startsWith('http')) {
        link = baseUrl + link;
      }
      return link;
    })
    .filter((link) => {
      const url = new URL(link);
      if (!uniqueLinks.some(uniqueLink => new URL(uniqueLink).hostname === url.hostname)) {
        uniqueLinks.push(link);
        return true;
      }
      return false;
    });
}

export const removeDuplicates = (links) => {
  return [...new Set(links)];
}