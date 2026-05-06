const fs = require("fs");
const path = require("path");

const config = require("./site-config.js");
const articles = JSON.parse(fs.readFileSync("./data/articles.json", "utf-8"));

// ✅ index.html is now your template
const homeTemplate = fs.readFileSync("./Index.html", "utf-8");
const articleTemplate = fs.readFileSync("./templates/article-template.html", "utf-8");

// output folder for articles only
const articleOut = "./articles";
fs.mkdirSync(articleOut, { recursive: true });

/* =========================================================
   1. DISCOVER-LIKE SCORING SYSTEM (UNCHANGED)
========================================================= */
function scoreArticle(article) {
  let score = 0;

  const daysOld =
    (Date.now() - new Date(article.datePublished)) / (1000 * 60 * 60 * 24);

  // freshness boost
  score += Math.max(0, 10 - daysOld);

  // quality signals
  if (article.image) score += 3;
  if (article.description && article.description.length > 50) score += 2;
  if (article.content && article.content.length > 500) score += 3;

  return score;
}

/* =========================================================
   2. PREPARE ARTICLES (UNCHANGED)
========================================================= */
const ranked = articles
  .map(a => ({ ...a, score: scoreArticle(a) }))
  .sort((a, b) => b.score - a.score);

/* =========================================================
   3. AUTO RELATED ARTICLES (UNCHANGED)
========================================================= */
function getRelated(article, all) {
  return all
    .filter(a => a.slug !== article.slug)
    .slice(0, 2);
}

/* =========================================================
   4. BUILD ARTICLE PAGES (UNCHANGED LOGIC)
========================================================= */
ranked.forEach(article => {

  const canonical = `${config.baseUrl}/articles/${article.slug}.html`;
  const related = getRelated(article, ranked);

  const html = articleTemplate
    .replace(/__TITLE__/g, article.title)
    .replace(/__DESCRIPTION__/g, article.description)
    .replace(/__IMAGE_URL__/g, article.image || "")
    .replace(/__CONTENT__/g, article.content)
    .replace(/__INTRO_PARAGRAPH__/g, article.intro || "")
    .replace(/__DATE_PUBLISHED__/g, article.datePublished)
    .replace(/__DATE_MODIFIED__/g, article.dateModified || article.datePublished)
    .replace(/__DISPLAY_DATE__/g, new Date(article.datePublished).toDateString())
    .replace(/__CANONICAL_URL__/g, canonical)
    .replace(/__RELATED_1__/g, related[0] ? `/articles/${related[0].slug}.html` : "#")
    .replace(/__RELATED_2__/g, related[1] ? `/articles/${related[1].slug}.html` : "#");

  fs.writeFileSync(
    path.join(articleOut, `${article.slug}.html`),
    html
  );
});

/* =========================================================
   5. BUILD HOMEPAGE (HERO + GRID)
========================================================= */
const latest = ranked[0];
const rest = ranked.slice(1);

// ⚠️ matches your current homepage structure (<a><h2><p>)
const grid = rest.map(article => `
<a href="/articles/${article.slug}.html">
    <h2>${article.title}</h2>
    <p>${article.description}</p>
</a>
`).join("");

const homepage = homeTemplate
  .replace(/{{LATEST_URL}}/g, `/articles/${latest.slug}.html`)
  .replace(/{{LATEST_IMAGE}}/g, latest.image)
  .replace(/{{LATEST_TITLE}}/g, latest.title)
  .replace(/{{LATEST_DESCRIPTION}}/g, latest.description)
  .replace(/{{ALL_ARTICLES_GRID}}/g, grid);

/* =========================================================
   6. SAFE WRITE TO index.html
========================================================= */

// write temp file first
fs.writeFileSync("./index.temp.html", homepage);

// replace original index.html
fs.renameSync("./index.temp.html", "./index.html");

/* =========================================================
   DONE
========================================================= */
console.log("✅ BUILD COMPLETE — ROOT SITE GENERATED");
