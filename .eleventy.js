const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const pluginRss = require("@11ty/eleventy-plugin-rss");
const embedYouTube = require("eleventy-plugin-youtube-embed");
const embedTwitter = require("eleventy-plugin-embed-twitter");
const striptags = require("striptags");
require("dotenv").config();

const AUTHORS = require("./src/data/AUTHORS.json");

function extractImage(article) {
  if (!article.hasOwnProperty("templateContent")) {
    console.warn(
      'Failed to extract excerpt: Document has no property "templateContent".'
    );
    return '';
  }

  const match = article.templateContent.match(/<img src="([^"]+)" alt="([^"]+)"/);

  if (match) {
    return `<img src="${match[1]}" alt="${match[2]}" loading="lazy"></img>`;
  }

  return '';
}

function extractExcerpt(article) {
  if (!article.hasOwnProperty("templateContent")) {
    console.warn(
      'Failed to extract excerpt: Document has no property "templateContent".'
    );
    return null;
  }

  let excerpt = null;
  const content = article.templateContent;

  excerpt = striptags(content)
    .substring(0, 100)
    .replace(/^\s+|\s+$|\s+(?=\s)/g, "")
    .trim()
    .concat("...");
  return excerpt;
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/sw.js");
  eleventyConfig.addPassthroughCopy("src/manifest.json");
  eleventyConfig.addPassthroughCopy("src/.well-known");
  eleventyConfig.addPassthroughCopy("CNAME");

  eleventyConfig.addFilter("processBrowserTagName", function (name) {
    return name.split(':')[1];
  });

  eleventyConfig.addFilter("onlyTags", function (tags) {
    return tags.filter(tag => !tag.startsWith('browser:'));
  });

  eleventyConfig.addFilter("onlyBrowsers", function (browsers) {
    return browsers.filter(browser => browser.startsWith('browser:'));
  });

  eleventyConfig.addShortcode("excerpt", (article) => extractExcerpt(article));

  eleventyConfig.addShortcode("mainImage", (article) => extractImage(article));

  eleventyConfig.addShortcode("lastTipDate", (collection) => {
    let lastDate = null;
    for (const post of collection) {
      if (!lastDate || post.date > lastDate) {
        lastDate = post.date;
      }
    }

    return lastDate.toISOString();
  });

  eleventyConfig.addShortcode("formatAuthors", authors => {
    const authorArray = Array.isArray(authors)
      ? authors
      : authors.split(",").map(a => a.trim());

    return authorArray
      .map(author =>
        AUTHORS[author] ? `<a href="${AUTHORS[author]}">${author}</a>` : author
      )
      .join(", ");
  });

  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(embedYouTube);
  eleventyConfig.addPlugin(embedTwitter);

  eleventyConfig.addTransform("fix-urls", async function(content) {
    if (this.inputPath.includes('/src/tips/en/')) {
      // Replace all relative links to other tips with their absolute links.
      // This is needed because we want relative file links in dev, in order
      // to benefit from markdown preview. But we want absolute links in prod.
      content = content.replace(/href="\.\/([^.]+)\.md"/g, 'href="/tips/en/$1"');

      // Also replace all relative image links with their absolute versions.
      content = content.replace(/src="\.\.\/\.\.\/assets\/img\//g, 'src="/assets/img/');
    }

    return content; // no change done.
  });

  // TODO: find a way to run this after dist has been created.
  // PageFind indexes HTML content, so this needs to run after the build.
  // But before the files are deployed to the server.
  // if (process.env.BUILD_ENV !== "dev") {
  //   // Index the site with PageFind after the build.
  //   eleventyConfig.on("afterBuild", () => {
  //     console.log("Indexing site with PageFind...");
  //     execSync(`npx pagefind --source dist --glob \"**/*.html\"`, { encoding: 'utf-8' })
  //   });
  // }

  return {
    dir: {
      input: "src",
      output: "dist",
      data: "data",
      layouts: "layouts",
      includes: "includes",
    }
  }
};
