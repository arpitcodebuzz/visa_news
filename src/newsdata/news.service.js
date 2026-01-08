// services/newsService.js
import Groq from "groq-sdk";
import groqConfig from "../common/config/groq.config.js";
import moment from "moment";
import axios from "axios";
import axiosRetry from 'axios-retry'
require('dotenv').config()
import * as cheerio from "cheerio";
import http from 'http'
import https from 'https'
import RSSParser from 'rss-parser'
const parser = new RSSParser();
import puppeteer from 'puppeteer'
import { error } from "console";

const { GROQ_API_KEY, GROQ_MODEL } = groqConfig;

const US_RSS_URL = "https://www.uscis.gov/news/rss-feed/59144";
const Cic_RSS_URL = 'https://www.cicnews.com/feed'

// const BASE_URL = 'https://www.cicnews.com/news';

const NEWS_URL = 'https://www.uscis.gov/newsroom/news-releases';  // main USCIS newsroom
// const BASE_URL = 'https://www.uscis.gov';

const apiKey = process.env.GNEWS_API_KEY;
console.log("🔑 GNEWS_API_KEY:", process.env.GNEWS_API_KEY);


if (!apiKey) {
  console.error('Missing GNEWS_API_KEY environment variable');
}


const TOI_TOPIC_URL = 'https://timesofindia.indiatimes.com/topic/visa-and-immigration';
const MAX_ARTICLES = 5;
const CONCURRENT_PAGES = 2;

const VISAGUIDE_URL = "https://visaguide.world/news/";


// -----------------------------------------------
const API_KEY = process.env.TAVILY_API_KEY;



class NewsService {
  // async newsData() {
  //   try {
  //     const todayDate = moment().format("DD MMMM YYYY");
  //     // console.log(todayDate)


  //     const prompt = `
  // You are a visa and immigration news generator.  
  // Fetch and generate the **latest visa and immigration news** only from the following sources:  

  // - Canada: IRCC, CIC News, CanadaVisa  
  // - UK: Home Office, UCAS, VFS Global  
  // - USA: USCIS, US Visa Bulletin  
  // - Australia: DHA (Department of Home Affairs)  
  // - Europe: EU Blue Card Portal, Poland Work Visa Portal  
  // - Middle East: UAE Immigration, Qatar e-Visa  
  // - Education Tests: IELTS, PTE, TOEFL  

  // ⚠️ IMPORTANT: Return ONLY valid JSON. No explanations, no markdown, no extra text.  

  // The JSON must follow exactly this structure:

  // {
  //   "country": "All",
  //   "date_generated": "${todayDate}", 
  //   "news": [
  //     {
  //       "country_name": "string",
  //       "headline": "string",
  //       "date": "${todayDate}",
  //       "time_uploaded": "HH:mm:ss",
  //       "content": [
  //         "Paragraph 1...",
  //         "Paragraph 2...",
  //         "Paragraph 3..."
  //       ],
  //       "source_links": [
  //         "https://source1.com",
  //         "https://source2.com"
  //       ]
  //     }
  //   ]
  // }

  // Rules:
  // - Always include at least 10–15 different countries in "news".
  // - Each article must include its original **upload/publish time** as "time_uploaded".
  // - Each article must have **2000–2500 words** across "content".
  // - "content" must always be an array of multiple paragraphs (not a single long string).
  // - "source_links" must always be an array (at least one real or placeholder link).
  // - Never include any text outside the JSON object.
  // - Prioritize pulling news only from the above official visa/immigration sources.
  // `;




  //     // ✅ Initialize Groq SDK
  //     const groq = new Groq({ apiKey: GROQ_API_KEY });

  //     // ✅ Call Groq API
  //     const response = await groq.chat.completions.create({
  //       model: GROQ_MODEL,
  //       messages: [{ role: "user", content: prompt }],
  //       temperature: 0.5,
  //       max_tokens: 5000, // allow enough space for long articles
  //     });

  //     // ✅ Extract raw content
  //     let rawText = response.choices?.[0]?.message?.content || "{}";

  //     // ✅ Clean markdown if present
  //     rawText = rawText.trim().replace(/```json|```/g, "");

  //     // ✅ Extract JSON block only (in case model adds intro text) 
  //     const match = rawText.match(/\{[\s\S]*\}/);
  //     if (!match) {
  //       throw new Error("No JSON object found in response");
  //     }

  //     let parsed;
  //     try {
  //       parsed = JSON.parse(match[0]);
  //     } catch (jsonError) {
  //       console.error("❌ JSON parse error:", jsonError.message, "\nRAW:", rawText);
  //       return {
  //         country: "All",
  //         news: [],
  //         rawResponse: rawText,
  //       };
  //     }

  //     // ✅ Format JSON nicely before returning
  //     return {
  //       ...parsed
  //     };

  //   } catch (error) {
  //     console.error("❌ Error in newsData:", error.message);
  //     return {
  //       country,
  //       news: [],
  //       error: "Failed to fetch visa news",
  //     };
  //   }
  // }

  // async fetchVisaNews(query) {
  //   try {
  //     const response = await axios.get("https://gnews.io/api/v4/search", {
  //       params: {
  //         q: query,
  //         lang: "en",
  //         max: 10, // keep higher limit, we’ll filter later
  //         token: process.env.GNEWS_API_KEY,
  //       },
  //       timeout: 20000,
  //     });

  //     const articles = response.data.articles || [];
  //     const seenUrls = new Set();
  //     let enrichedArticles = [];

  //     for (const article of articles) {
  //       // 🧹 Skip duplicates by URL
  //       if (seenUrls.has(article.url)) continue;
  //       seenUrls.add(article.url);

  //       let fullContent = article.content || "";

  //       try {
  //         const page = await axios.get(article.url, {
  //           timeout: 8000,
  //           headers: {
  //             "User-Agent":
  //               "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  //           },
  //         });

  //         const $ = cheerio.load(page.data);
  //         const paragraphs = $("p")
  //           .map((i, el) => $(el).text().trim())
  //           .get();

  //         if (paragraphs.length > 0) {
  //           fullContent = paragraphs.join("\n\n");
  //         }
  //       } catch (scrapeErr) {
  //         console.warn(`⚠️ Scraping failed for: ${article.url}`);
  //       }

  //       // ✅ Always include article, fallback if needed
  //       enrichedArticles.push({
  //         title: article.title?.trim(),
  //         url: article.url,
  //         source: article.source?.name || "Unknown",
  //         publishedAt: article.publishedAt,
  //         image: article.image || null,
  //         content: fullContent || article.description || "",
  //       });
  //     }

  //     // 🧩 Final step: remove duplicates by title similarity
  //     const uniqueArticles = [];
  //     const seenTitles = new Set();

  //     for (const art of enrichedArticles) {
  //       const normalizedTitle = art.title?.toLowerCase().replace(/[^\w\s]/g, "");
  //       if (seenTitles.has(normalizedTitle)) continue;
  //       seenTitles.add(normalizedTitle);
  //       uniqueArticles.push(art);
  //     }

  //     return {
  //       status: true,
  //       total: uniqueArticles.length,
  //       articles: uniqueArticles,
  //     };
  //   } catch (error) {
  //     console.error("❌ Visa news error:", error.message);
  //     return {
  //       status: false,
  //       message: "Failed to fetch visa news",
  //       error: error.message,
  //     };
  //   }
  // }

  // async fetchLatestNews(query) {
  //   try {
  //     const feed = await parser.parseURL(Cic_RSS_URL);
  //     const newsList = [];

  //     const itemsToFetch = feed.items;

  //     for (const item of itemsToFetch) {
  //       let fullContent = [];

  //       try {
  //         const { data: html } = await axios.get(item.link, {
  //           headers: {
  //             'User-Agent':
  //               'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  //           },
  //           timeout: 30000,
  //         });

  //         const $ = cheerio.load(html);
  //         const selectors = ['.td-post-content', '.post-body', '.entry-content', '.post-content'];
  //         let wrapper;

  //         for (const sel of selectors) {
  //           if ($(sel).length) {
  //             wrapper = $(sel);
  //             break;
  //           }
  //         }

  //         if (!wrapper || wrapper.text().trim().length < 20) {
  //           fullContent = ['Full content not available'];
  //         } else {
  //           wrapper.find('p, h2, h3, li, strong, em').each((_, el) => {
  //             const text = $(el).text().trim();
  //             if (text) fullContent.push(text);
  //           });

  //           wrapper.find('table').each((_, table) => {
  //             const rows = [];
  //             $(table)
  //               .find('tr')
  //               .each((_, tr) => {
  //                 const cells = [];
  //                 $(tr)
  //                   .find('th, td')
  //                   .each((_, td) => {
  //                     const text = $(td).text().trim();
  //                     if (text) cells.push(text);
  //                   });
  //                 if (cells.length) rows.push(cells.join(' | '));
  //               });
  //             if (rows.length) fullContent.push(rows.join('\n'));
  //           });

  //           if (!fullContent.length) fullContent = ['Full content not available'];
  //         }
  //       } catch (err) {
  //         console.error('Error scraping article:', item.link, err.message);
  //         fullContent = ['Full content not available'];
  //       }

  //       newsList.push({
  //         title: item.title,
  //         url: item.link,
  //         summary: item.contentSnippet || '',
  //         date: item.pubDate,
  //         fullContent,
  //       });
  //     }

  //     return {
  //       status: true,
  //       total: newsList.length,
  //       data: newsList,
  //     };
  //   } catch (err) {
  //     console.error('Failed to fetch news', err);
  //     return { status: false, message: 'Failed to fetch news', error: err.message };
  //   }
  // }

  // async fetchUSCISNews(limit = 5) {
  //   try {
  //     const parser = new RSSParser();
  //     const feed = await parser.parseURL(US_RSS_URL);

  //     const items = feed.items.slice(0, limit);

  //     const unwantedPhrases = [
  //       "Official websites use .gov",
  //       "A .gov website belongs to an official government organization",
  //       "Secure .gov websites use HTTPS",
  //       "Share sensitive information only on official, secure websites",
  //       "Sign In",
  //       "Create Account",
  //       "Contact us",
  //       "Multilingual Resources"
  //     ];

  //     const articles = await Promise.all(
  //       items.map(async item => {
  //         const articleData = {
  //           title: item.title,
  //           url: item.link,
  //           date: item.pubDate,
  //           summary: item.contentSnippet || item.content || "No summary available",
  //         };

  //         try {
  //           const { data: html } = await axios.get(articleData.url, {
  //             headers: {
  //               "User-Agent":
  //                 "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  //             },
  //             timeout: 15000,
  //           });

  //           const $ = cheerio.load(html);
  //           const contentWrapper = $(".field--name-body");
  //           const fullContent = [];

  //           if (contentWrapper.length) {
  //             contentWrapper.find("p, li, h2, h3, strong, em").each((_, el) => {
  //               const text = $(el).text().trim();
  //               if (
  //                 text &&
  //                 !unwantedPhrases.some(phrase => text.toLowerCase().includes(phrase.toLowerCase())) &&
  //                 !text.toLowerCase().includes(".gov") &&
  //                 !text.toLowerCase().includes("https://") &&
  //                 !text.toLowerCase().includes("lock")
  //               ) {
  //                 fullContent.push(text);
  //               }
  //             });

  //             contentWrapper.find("table").each((_, table) => {
  //               const rows = [];
  //               $(table)
  //                 .find("tr")
  //                 .each((_, tr) => {
  //                   const cells = [];
  //                   $(tr)
  //                     .find("th, td")
  //                     .each((_, td) => {
  //                       const text = $(td).text().trim();
  //                       if (
  //                         text &&
  //                         !unwantedPhrases.some(phrase => text.toLowerCase().includes(phrase.toLowerCase())) &&
  //                         !text.toLowerCase().includes(".gov") &&
  //                         !text.toLowerCase().includes("https://") &&
  //                         !text.toLowerCase().includes("lock")
  //                       ) {
  //                         cells.push(text);
  //                       }
  //                     });
  //                   if (cells.length) rows.push(cells.join(" | "));
  //                 });
  //               if (rows.length) fullContent.push(rows.join("\n"));
  //             });
  //           }

  //           articleData.fullContent =
  //             fullContent.length > 0 ? fullContent : ["Full content not available"];
  //         } catch (err) {
  //           console.error("❌ Error scraping:", articleData.url, err.message);
  //           articleData.fullContent = ["Full content not available"];
  //         }

  //         return articleData;
  //       })
  //     );

  //     return {
  //       status: true,
  //       total: articles.length,
  //       data: articles,
  //     };
  //   } catch (err) {
  //     console.error("❌ Failed to fetch USCIS RSS:", err.message);
  //     return {
  //       status: false,
  //       message: "Failed to fetch USCIS RSS",
  //       error: err.message,
  //     };
  //   }
  // }

  // async getNews() {
  //   try {
  //     const url =
  //       "https://www.y-axis.com/wp-json/wp/v2/posts?categories=27&per_page=10";
  //     // categories=27 is usually the 'News' category; adjust if needed

  //     const { data } = await axios.get(url, {
  //       headers: {
  //         "User-Agent":
  //           "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  //       },
  //     });

  //     const articles = data.map((post) => ({
  //       title: post.title.rendered,
  //       link: post.link,
  //       date: post.date,
  //       excerpt: post.excerpt.rendered.replace(/<[^>]*>?/gm, ""), // remove HTML tags
  //       image:
  //         post.featured_media &&
  //         `https://www.y-axis.com/wp-content/uploads/${post.featured_media}.jpg`,
  //     }));
  //     // const BASE_URL = "https://www.business-standard.com";
  //     // const PAGE_URL = `${BASE_URL}/immigration`;

  //     // const { data: html } = await axios.get(PAGE_URL, {
  //     //   headers: {
  //     //     "User-Agent":
  //     //       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  //     //   },
  //     // });

  //     // const $ = cheerio.load(html);
  //     // const links = [];

  //     // $("a").each((i, el) => {
  //     //   const href = $(el).attr("href");
  //     //   if (href && href.includes("/immigration/") && !href.endsWith("/immigration")) {
  //     //     const fullLink = href.startsWith("http")
  //     //       ? href
  //     //       : `${BASE_URL}${href}`;
  //     //     if (!links.includes(fullLink)) links.push(fullLink);
  //     //   }
  //     // });

  //     // const articles = [];

  //     // // Loop through first 10 articles to avoid overloading
  //     // for (let i = 0; i < Math.min(links.length, 10); i++) {
  //     //   const articleUrl = links[i];
  //     //   try {
  //     //     const { data: articleHtml } = await axios.get(articleUrl, {
  //     //       headers: {
  //     //         "User-Agent":
  //     //           "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  //     //       },
  //     //     });

  //     //     const $$ = cheerio.load(articleHtml);

  //     //     const title =
  //     //       $$("meta[property='og:title']").attr("content") ||
  //     //       $$("h1").text().trim();

  //     //     const date =
  //     //       $$("meta[property='article:published_time']").attr("content") ||
  //     //       $$("time").first().text().trim();

  //     //     const image =
  //     //       $$("meta[property='og:image']").attr("content") ||
  //     //       $$("img").first().attr("src");

  //     //     const paragraphs = [];
  //     //     $$("article p, .story-content p, .article-body p, p").each((i, p) => {
  //     //       const text = $$(p).text().trim();
  //     //       if (text) paragraphs.push(text);
  //     //     });

  //     //     const content = paragraphs.join("\n\n");

  //     //     articles.push({
  //     //       title,
  //     //       date,
  //     //       image: image?.startsWith("http") ? image : `${BASE_URL}${image}`,
  //     //       url: articleUrl,
  //     //       content,
  //     //     });
  //     //   } catch (err) {
  //     //     console.log("Error scraping article:", articleUrl);
  //     //   }
  //     // }

  //     return {
  //       status: "success",
  //       // data: html
  //       total: articles.length,
  //       articles,
  //     };
  //   }
  //   catch (err) {
  //     console.error("❌ Failed to fetch immigration news:", err.message);
  //     return {
  //       status: false,
  //       message: "Failed to fetch immigration news",
  //       error: err.message,
  //     };
  //   }
  // }

  // async getTimesOfIndiaNews() {
  //   let browser;
  //   try {
  //     browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  //     const page = await browser.newPage();
  //     await page.goto(TOI_TOPIC_URL, { waitUntil: 'domcontentloaded', timeout: 0 });

  //     // Scroll and collect article links
  //     const articleLinks = new Set();
  //     while (articleLinks.size < MAX_ARTICLES) {
  //       const linksOnPage = await page.$$eval('a[href*="/articleshow/"]', els =>
  //         els.map(el => el.href.split('?')[0])
  //       );
  //       linksOnPage.forEach(link => articleLinks.add(link));

  //       if (articleLinks.size >= MAX_ARTICLES) break;

  //       await page.evaluate(() => window.scrollBy(0, window.innerHeight));
  //       await page.waitForTimeout(1000); // wait for new articles to load
  //     }
  //     await page.close();

  //     const links = Array.from(articleLinks).slice(0, MAX_ARTICLES);
  //     const newsList = [];

  //     // Scrape articles concurrently in batches
  //     for (let i = 0; i < links.length; i += CONCURRENT_PAGES) {
  //       const batch = links.slice(i, i + CONCURRENT_PAGES);
  //       const results = await Promise.all(
  //         batch.map(async (link) => {
  //           const articlePage = await browser.newPage();
  //           try {
  //             await articlePage.goto(link, { waitUntil: 'domcontentloaded', timeout: 0 });
  //             await articlePage.waitForSelector(
  //               'div[itemprop="articleBody"], .Normal, article, #content, .artText',
  //               { timeout: 5000 }
  //             ).catch(() => { });

  //             // Extract full content using multiple selectors
  //             let fullContent = [];
  //             const selectors = [
  //               'div[itemprop="articleBody"] p',
  //               '.Normal',
  //               'article p',
  //               '#content p',
  //               '.artText p',
  //             ];
  //             for (const sel of selectors) {
  //               const content = await articlePage.$$eval(
  //                 sel,
  //                 nodes => nodes.map(n => n.innerText.trim()).filter(t => t)
  //               );
  //               if (content.length) {
  //                 fullContent = content;
  //                 break;
  //               }
  //             }

  //             const title = await articlePage.$eval('h1', el => el.innerText.trim()).catch(() => 'Untitled');
  //             const summary = await articlePage.$eval('meta[name="description"]', el => el.content).catch(() => '');
  //             const date = await articlePage.$eval(
  //               'meta[property="article:published_time"], .publish_on, .byline span',
  //               el => el.getAttribute('content') || el.innerText.trim()
  //             ).catch(() => '');

  //             await articlePage.close();

  //             return {
  //               title,
  //               url: link,
  //               summary,
  //               date,
  //               fullContent: fullContent.length ? fullContent : ['Full content not available'],
  //             };
  //           } catch (err) {
  //             await articlePage.close();
  //             return {
  //               title: 'Error fetching article',
  //               url: link,
  //               summary: '',
  //               date: '',
  //               fullContent: ['Full content not available'],
  //             };
  //           }
  //         })
  //       );

  //       newsList.push(...results);
  //     }

  //     return {
  //       status: true,
  //       total: newsList.length,
  //       data: newsList,
  //     };
  //   } catch (err) {
  //     console.error('Failed to fetch news:', err.message);
  //     return {
  //       status: false,
  //       message: 'Failed to fetch news',
  //       error: err.message,
  //     };
  //   } finally {
  //     if (browser) await browser.close();
  //   }
  // }

  // async scrapeVisaGuideNews() {
  //   let browser;
  //   try {
  //     browser = await puppeteer.launch({
  //       headless: true,
  //       args: ["--no-sandbox", "--disable-setuid-sandbox"],
  //     });

  //     const page = await browser.newPage();
  //     await page.goto(VISAGUIDE_URL, { waitUntil: "networkidle2", timeout: 60000 });

  //     await page.waitForSelector("div[id^='tdi_']", { timeout: 30000 });

  //     const articleLinks = await page.$$eval("div[id^='tdi_'] a", links =>
  //       links.map(a => a.href).filter(url => url.includes("/news/"))
  //     );

  //     const results = [];

  //     for (let link of articleLinks.slice(0, 10)) {
  //       try {
  //         const articlePage = await browser.newPage();
  //         await articlePage.goto(link, { waitUntil: "networkidle2", timeout: 60000 });

  //         const data = await articlePage.evaluate(() => {
  //           const title = document.querySelector("h1")?.innerText?.trim() || "";
  //           const date = document.querySelector(".jeg_meta_date")?.innerText?.trim() || "";
  //           const contentElements = document.querySelectorAll(".content-inner p");
  //           const content = Array.from(contentElements)
  //             .map(p => p.innerText.trim())
  //             .filter(Boolean);

  //           return { title, date, content };
  //         });

  //         results.push({ ...data, url: link });
  //         await articlePage.close();
  //       } catch (err) {
  //         console.error("Error scraping article:", link, err.message);
  //       }
  //     }

  //     return {
  //       status: true,
  //       total: results.length,
  //       data: results
  //     };
  //   }
  //   catch (err) {
  //     console.error("Error in VisaGuide scraper:", err);
  //     return { status: false, message: "Failed to scrape VisaGuide", error: err.message };
  //   }
  //   finally {
  //     if (browser) await browser.close();
  //   }
  // }

  async fetchVisaNewsWithFullContent(country) {
    const query = country
      ? `latest visa and immigration news in ${country}`
      : `latest visa and immigration news around the world`;

    try {
      const response = await axios.post("https://api.tavily.com/search", {
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: 20,
        include_answer: true,
        include_raw_content: true,
        include_images: true, // ✅ fetch images
      });

      const results = response.data.results || [];

      // Visa/immigration keywords
      const visaKeywords = [
        "visa",
        "immigration",
        "migrant",
        "migration",
        "citizenship",
        "h-1b",
        "student visa",
        "residency",
        "green card",
        "passport",
        "travel ban",
        "work permit",
        "asylum",
        "refugee",
      ];

      const cleanText = (raw) => {
        if (!raw) return "Content not available.";
        const text = raw.replace(/<[^>]*>/g, "");
        return text.replace(/\s+/g, " ").trim();
      };

      const filteredNews = results.filter((item) => {
        const text = `${item.title || ""} ${item.snippet || ""}`.toLowerCase();
        return visaKeywords.some((kw) => text.includes(kw));
      });

      const newsData = filteredNews.map((article) => ({
        title: article.title ? article.title.trim() : "No Title",
        url: article.url,
        snippet: article.snippet ? article.snippet.trim() : "",
        full_content: cleanText(article.raw_content),
        published_date: article.published_date || null,
        images: article.images || [],
      }));

      return {
        status: true,
        total: newsData.length,
        data: newsData,
      };
    } catch (error) {
      console.error("Tavily API Error:", error.message);
      return {
        status: false,
        message: "Failed to fetch visa and immigration news",
      };
    }
  }


  async getSerpiNews(countryFilter) {
    try {
      const allCountries = [
        "Canada", "US", "Australia", "Germany", "New Zealand", "India", "China", "UK",
        "Afghanistan", "Armenia", "Bangladesh", "Bhutan", "Indonesia", "Iran", "Iraq", "Israel", "Japan"
      ];

      const countries = countryFilter
        ? allCountries.filter(c => c.toLowerCase() === countryFilter.toLowerCase())
        : allCountries;

      const visaKeywords = [
        "visa", "immigration", "migrant", "migration", "citizenship",
        "h-1b", "student visa", "residency", "green card",
        "passport", "travel ban", "work permit", "asylum", "refugee"
      ];

      // let allNews = [];

      // for (const country of countries) {
      //   try {
      //     const query = `visa and immigration news ${country}`;
      //     const response = await axios.get("https://serpapi.com/search.json", {
      //       params: {
      //         api_key: process.env.SERPAPI_API_KEY,
      //         engine: "google_news",
      //         q: query,
      //         hl: "en",
      //         gl: "us",
      //         num: countryFilter ? 30 : 10

      //       },
      //     });

      //     const articles = response.data.news_results || [];

      //     const filtered = articles.filter(a =>
      //       visaKeywords.some(kw =>
      //         (a.title + " " + (a.snippet || "")).toLowerCase().includes(kw)
      //       )
      //     );

      //     const limitArticles = countryFilter ? filtered.length : 3

      //     const newsData = await Promise.all(
      //       filtered.slice(0, limitArticles).map(async article => {
      //         let fullContent = [];
      //         let metaImage = "";

      //         const thumbnail = article.thumbnail || null;
      //         const image = article.image || null;

      //         try {
      //           const htmlRes = await axios.get(article.link, { timeout: 2000 });
      //           const $ = cheerio.load(htmlRes.data);

      //           // Get all <p> text with length > 50
      //           const paragraphs = $("p")
      //             .map((i, el) => $(el).text().trim())
      //             .get()
      //             .filter(p => p.length > 50);

      //           // Combine paragraphs into 3 blocks (2-3 paragraphs per block)
      //           let tempBlock = "";
      //           let counter = 0;
      //           const numBlocks = 3; // number of final paragraphs you want
      //           const chunkSize = Math.ceil(paragraphs.length / numBlocks);

      //           for (let i = 0; i < paragraphs.length; i += chunkSize) {
      //             const block = paragraphs.slice(i, i + chunkSize).join(" ");
      //             fullContent.push(block.trim());
      //           }

      //           metaImage =
      //             $('meta[property="og:image"]').attr("content") ||
      //             $('meta[name="twitter:image"]').attr("content") ||
      //             null;

      //         } catch (e) {
      //           fullContent = article.snippet ? [article.snippet] : [];
      //           metaImage = null;
      //         }

      //         // Include all articles with at least 1 paragraph block
      //         if (fullContent && fullContent.length > 0) {
      //           return {
      //             country,
      //             title: article.title || "No Title",
      //             url: article.link,
      //             snippet: article.snippet || "",
      //             full_content: fullContent, // 2-3 paragraph blocks
      //             published_date: article.date || null,
      //             source: article.source || "",
      //             thumbnail,
      //             _timestamp: article.date ? new Date(article.date).getTime() : 0,
      //           };
      //         } else {
      //           return null;
      //         }
      //       })
      //     );

      //     allNews = allNews.concat(newsData.filter(n => n !== null));

      //   } catch (err) {
      //     console.log("Failed to fetch news for", country, err.message);
      //   }
      // }
      // // console.log(allNews, 'allNews')

      // // // sortby date
      // allNews.sort((a, b) => b._timestamp - a._timestamp);

      // // // pagination
      // // // const startIndex = (page - 1) * pageSize;
      // // // const paginatedData = allNews.slice(startIndex, startIndex + pageSize);

      const allNews = [
        {
          "country": "Bangladesh",
          "title": "Dhaka to seek exemption from US visa bond: Touhid",
          "url": "https://www.bssnews.net/news-flash/349249",
          "snippet": "",
          "full_content": [
            "DHAKA, Jan 8, 2026 (BSS) - Bangladesh will pursue diplomatic efforts to seek exemption from the United States' newly imposed visa bond requirement, Foreign Adviser Md Touhid Hossain said today, describing the measure as unfortunate but not abnormal. \"It is certainly unfortunate and painful for us, but it is not abnormal,\" he told reporters at the Foreign Ministry here this afternoon. The adviser said the decision taken by the US is not limited to Bangladesh alone, as a number of countries facing immigration-related challenges have also been brought under the measure. He said Bangladesh's inclusion does not appear unusual, citing US concerns over immigration and misuse of social support systems.",
            "The foreign adviser said this non-regular immigration problem is policy-related and had been continuing since long. Highlighting the interim government's stance, he said from the very beginning it has opposed irregular migration, stressing that curbing such migration is the only sustainable solution. He said reports of people dying or being rescued while crossing the Mediterranean continue to surface, describing them as victims deserving sympathy, while noting that laws are also being violated. According to information published on the US Department of State travel website, nationals of 38 countries will be required to post a visa bond of up to US$15,000 when applying to enter the United States.",
            "The US had initially included six countries in the visa bond list in August last year, later adding seven more. On Tuesday, another 25 countries, including Bangladesh were added. The website said the bond requirement for the newly added countries, with a few exceptions, will come into effect from January 21. Managing Director and Chief Editor : Mahbub Morshed"
          ],
          "published_date": "01/08/2026, 12:06 PM, +0000 UTC",
          "source": {
            "name": "Bangladesh Sangbad Sangstha (BSS)",
            "icon": "https://encrypted-tbn3.gstatic.com/faviconV2?url=https://www.bssnews.net&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL"
          },
          "thumbnail": "https://www.bssnews.net/assets/news_photos/2026/01/08/image-349249-1767873828.jpg",
          "_timestamp": 1767873960000
        },
        {
          "country": "Canada",
          "title": "What changes in Canada’s immigration rules in 2026",
          "url": "https://m.economictimes.com/nri/migrate/what-changes-in-canadas-immigration-rules-in-2026/articleshow/126407843.cms",
          "snippet": "",
          "full_content": [
            "Canada introduces new Express Entry category and immigration measures for doctors Canada introduces personalised processing times for PR and citizenship applications",
            "(Join our ETNRI WhatsApp channel for all the latest updates) (Catch all the Business News, Breaking News, and Latest News Updates on The Economic Times.)",
            "Subscribe to The Economic Times Prime and read the ET ePaper online."
          ],
          "published_date": "01/08/2026, 06:08 AM, +0000 UTC",
          "source": {
            "name": "The Economic Times",
            "icon": "https://encrypted-tbn3.gstatic.com/faviconV2?url=https://m.economictimes.com&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL"
          },
          "thumbnail": "https://m.economictimes.com/thumb/msid-126407829,width-1200,height-900,resizemode-4,imgsize-244944/canada-immigration.jpg",
          "_timestamp": 1767852480000
        },
        {
          "country": "Bangladesh",
          "title": "US makes up to Tk18 lakh visa bond mandatory for Bangladeshi B1/B2 applicants from 21 Jan",
          "url": "https://www.tbsnews.net/bangladesh/migration/bangladeshis-now-required-post-visa-bonds-us-b1b2-visas-21-january-1328051",
          "snippet": "",
          "full_content": [
            "Bangladeshi nationals applying for B1/B2 (business or tourism) visas of the United States will be required to submit a visa bond from 21 January 2026, after Bangladesh was included in a new pilot programme announced by the US Department of State. According to information published on travel.state.gov, Bangladesh is among dozens of countries whose citizens have been identified as subject to visa bond requirements under a Temporary Final Rule (TFR) introduced in line with Section 221(g)(3) of the US Immigration and Nationality Act (INA). Under the programme, any Bangladeshi passport holder found otherwise eligible for a B1/B2 visa must post a bond of $5,000 (Tk611,552), $10,000 (Tk1,223,104), or $15,000 (Tk1,834,656). The bond amount will be determined by a consular officer at the time of the visa interview and is based on overstay risk assessments using B1/B2 overstay rates from the US Department of Homeland Security's Entry/Exit Overstay Report. Applicants directed to post a bond will be required to submit the Department of Homeland Security's Form I-352 (Immigration Bond) and agree to the bond terms through the US Department of the Treasury's official online payment platform, pay.gov. The requirement applies regardless of where the visa application is submitted.",
            "The State Department has cautioned applicants not to submit Form I-352 or pay any bond amount unless specifically instructed by a consular officer. Payments made without official direction will not be refunded, and the US government has warned that it bears no responsibility for money paid through third-party websites. The department has also clarified that posting a bond does not guarantee visa issuance. As an additional condition, visa holders who post a bond must enter and exit the United States only through designated ports of entry: Boston Logan International Airport (BOS), John F Kennedy International Airport (JFK), and Washington Dulles International Airport (IAD). Failure to comply may result in denied entry or an unrecorded departure. The visa bond will be automatically cancelled and refunded if the Department of Homeland Security records that the traveller departs the US on or before the authorised stay period, does not travel to the US before the visa expires, or is denied admission at the port of entry.",
            "However, the bond may be forfeited if authorities determine a breach of its conditions. Situations that could trigger a review include overstaying beyond the authorised period, failing to depart the US, or applying to adjust status from a non-immigrant visa, including seeking asylum. Cases involving potential breaches will be referred by the Department of Homeland Security to US Citizenship and Immigration Services for determination. Bangladesh joins several other countries, including Nigeria, Nepal, Venezuela, and Uganda, under the visa bond pilot programme, which aims to curb visa overstays and strengthen compliance with US immigration rules. While most comments will be posted if they are on-topic and not abusive, moderation decisions are subjective. Published comments are readers’ own views and The Business Standard does not endorse any of the readers’ comments."
          ],
          "published_date": "01/07/2026, 09:56 PM, +0000 UTC",
          "source": {
            "name": "The Business Standard",
            "icon": "https://encrypted-tbn2.gstatic.com/faviconV2?url=https://www.tbsnews.net&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL"
          },
          "thumbnail": "https://www.tbsnews.net/sites/default/files/styles/amp_metadata_content_image_min_696px_wide/public/images/2026/01/07/us_visa.jpg",
          "_timestamp": 1767822960000
        },
        {
          "country": "Australia",
          "title": "Holiday Staffing Lull Slows Australian Visa Decisions Until Mid-January",
          "url": "https://www.visahq.com/news/2026-01-07/au/holiday-staffing-lull-slows-australian-visa-decisions-until-mid-january/",
          "snippet": "",
          "full_content": [
            "Choose how often you would like to receive our newsletter:"
          ],
          "published_date": "01/07/2026, 08:34 PM, +0000 UTC",
          "source": {
            "name": "VisaHQ",
            "icon": "https://encrypted-tbn2.gstatic.com/faviconV2?url=https://www.visahq.com&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL"
          },
          "thumbnail": "https://visa-hq-news-images.s3.us-east-1.amazonaws.com/news_images/b6da9343-885f-4199-9b76-7bea956651f6_middle.jpg",
          "_timestamp": 1767818040000
        },
        {
          "country": "New Zealand",
          "title": "Record number of New Zealanders face visa troubles in United States",
          "url": "https://www.rnz.co.nz/news/national/583451/record-number-of-new-zealanders-face-visa-troubles-in-united-states",
          "snippet": "",
          "full_content": [
            "MFAT warns travellers may encounter greater scrutiny at the US border. \nPhoto: RNZ The number of New Zealanders held in US detention or having immigration difficulties in America rose to a new high of 39 last year, according to the Ministry of Foreign Affairs and Trade (MFAT). Latest available White House figures suggest more than 900 New Zealanders overstayed their US visa in 2024. The US administration has stepped up border controls since Donald Trump came to power a year ago, including searches of electronic devices and social media accounts. Have you been affected? Share you stories with us at  iwitness@rnz.co.nz MFAT data shows 29 New Zealanders sought help after encountering border or visa issues in the US in the last financial year (2024-25).",
            "In the last six months, there have been another 16. The figures reflect only those who contacted MFAT for help. New Zealand woman Sarah Shaw and her six-year-old son were among them. They were released last year after three weeks in a Texan detention centre because of a problem with her paperwork when she arrived back from Canada. And New Zealand-born reggae artist Lotima Nicholas Pome'e - aka General Fiyah - was detained and sent back to New Zealand before he could perform at Polyfest, a major Pacific cultural festival, in August. MFAT's Safe Travel website warned New Zealanders to exercise increased caution, due to safety and security issues. It noted the US government had strict rules for entering and staying in the country and that travellers may encounter greater scrutiny at the border. There was also now a requirement for most visitors to register with US authorities if they were staying more than 30 days. Sign up for Ngā Pitopito Kōrero, a daily newsletter curated by our editors and delivered straight to your inbox every weekday.",
            "The Trump administration has been implementing a nationwide crackdown on migrants since taking office in January. Sarah Shaw describes her three weeks in a US detainment centre with her six-year-old son. Audio The Katayanagi Twins were reportedly denied entry into the United States and were put on a flight back to New Zealand. General Fiyah had been scheduled to perform at Polyfest in Washington. Explainer - When travelling to America as a tourist or on a visa, US Customs have the right to search your devices - as do many other countries. Audio"
          ],
          "published_date": "01/07/2026, 04:02 PM, +0000 UTC",
          "source": {
            "name": "RNZ",
            "icon": "https://encrypted-tbn0.gstatic.com/faviconV2?url=https://www.rnz.co.nz&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL",
            "authors": ["Gillian Bonnett"]
          },
          "thumbnail": "https://media.rnztools.nz/rnz/image/upload/s--EuAJKyAq--/ar_16:10,c_fill,f_auto,g_auto,q_auto,w_1050/v1750816691/4K596J4_us_customs_phone_jpg?_a=BACCd2AD",
          "_timestamp": 1767801720000
        },
        {
          "country": "India",
          "title": "US Embassy Issues Strict Advisory To Indian Student Visa Holders On Legal Violations",
          "url": "https://www.thehansindia.com/news/national/us-embassy-issues-strict-advisory-to-indian-student-visa-holders-on-legal-violations-1037402",
          "snippet": "",
          "full_content": [
            "The US Embassy in India has cautioned student visa holders that breaking American laws could result in visa cancellation, deportation, and future travel bans amid tighter immigration enforcement.",
            "© 2024 Hyderabad Media House Limited / The Hans India. All rights reserved. Powered by www.bvmdigitalmedia.com"
          ],
          "published_date": "01/07/2026, 02:31 PM, +0000 UTC",
          "source": {
            "name": "The Hans India",
            "icon": "https://encrypted-tbn2.gstatic.com/faviconV2?url=https://www.thehansindia.com&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL"
          },
          "thumbnail": "https://assets.thehansindia.com/h-upload/2026/01/07/1615520-visa.webp",
          "_timestamp": 1767796260000
        },
        {
          "country": "UK",
          "title": "Tracking UK migration: Small boats, asylum hotels and visas",
          "url": "https://www.bbc.com/news/articles/c70989jrdweo",
          "snippet": "",
          "full_content": [
            "Net migration to the UK - the number of people arriving, minus those leaving - has fallen close to pre-Covid levels, according to official figures. How does that sit alongside other key migration measures, including overall immigration, small boat arrivals and visas granted? Scroll down to find out more about the latest key figures, and get answers to key questions on a range of topics. Produced by: Rob England, Libby Rogers, Jess Carr, John Walton, Becky Dale, Allison Shultes, Chris Kay, Steven Connor and Scott Jarvis. Graphics by: Jez Frazer, Zoe Bartholomew and Joy Roxas *The figure for net migration will not sum exactly to the total of immigration minus emigration, because it is published as a rounded figure by the Office for National Statistics (ONS). Figures from government or other official sources used in this report can be revised retrospectively between publications. This page only displays data as it is presented in the latest release. ONS figures for immigration and emigration are update twice per year. Small boats figures from the Home Office are updated daily. Asylum, returns and visa figures from the Home Office are updated every three months. The number of people appealing against a refused asylum decision is updated every three months by the Ministry of Justice at a different time to other government figures on asylum. Figures for net migration come from the ONS and use the internationally recognised definition of a long-term migrant: \"a person who moves to a country other than that of their usual residence for at least a year.\" Data for total entries via visas only includes those granted. It does not include people coming to the UK on a visitor visa or those on a transit visa - whose final destination is not the UK. Visa figures do not show if or when an individual arrived in the UK, but marks the point at which they were granted permission to do so. If someone was granted more than one visa within the year shown, each one is counted separately. The work category refers to new individuals linked to visas and permits, or the extension of an existing permission. This includes sub-categories such as seasonal, health and care, domestic and youth mobility visas. Study visas include all sponsored individuals by approved education providers in the UK, and those on short-term study visas. Family visas lets someone come to the UK or stay longer so they can live with close family members who are already here. It includes joining a spouse, partner, child or parent, or coming to care for a relative.",
            "The Other category refers to miscellaneous visas outside the categories of work, family and study. It includes humanitarian routes such as the Ukraine Sponsorship Scheme and the British National Overseas route. It also includes family permits for people from countries in the European Union or European Economic Area. Figures for asylum seekers in hotels are published by the Home Office under the \"contingency accommodation - hotel\" category. The number of people in all other forms of accommodation includes those in non-hotel contingency accommodation, plus initial, dispersal and \"other\" accommodation. A scale is used to determine how close a local authority is from the average share of the population for an area in the UK. It compares the share in that area to the share across all areas in the UK that use that form of accommodation. Figures on the backlog of people waiting for an initial decision on an asylum application include both applicants and dependants. The number of open appeals against refused asylum applications refers to individuals. The figures for small boat crossings and the average number of people per boat are derived from the UK Home Office's daily timeseries. Entering the UK without permission is an offence under immigration law, but asylum seekers are generally not prosecuted for doing so if they claim asylum on arrival. In some cases, people have been prosecuted for entering the UK without permission alongside other offences, such as people smuggling or re-entering after deportation. The International Organization for Migration (IOM) collects figures for people who died or went missing while crossing from mainland Europe to the UK. These reports are based on  French and UK officials (such as police or coastguard) or media sources, and are considered an undercount by the IOM due to a lack of official statistics. The figures can include people who died in the Channel while crossing, but also those who died at any point while en route to a crossing point. Data for modern slavery only includes final decisions. Modern slavery includes any form of human trafficking, slavery, servitude or forced labour. Figures for other entries without permission are the sum of all irregular arrivals that were not by small boat, including inadequately documented air arrivals, recorded detections at UK ports and other recorded detections in the UK. Figures on people who come to the UK but are denied entry at that point and then leave the country are not included in the number of returns in this page. People being returned after being convicted of a criminal offence includes people who are not British citizens who have been convicted in the UK of any criminal offence, or convicted abroad for a serious criminal offence.",
            "Returns involving the government include the Home Office categories of enforced returns (also known as deportations) as well as assisted and controlled voluntary returns. Independent returns are referred to by the government as other verified returns. Sea arrivals figures are taken from the UNHCR European sea arrivals dashboard and combined with UK Home Office figures for small boat arrivals. Asylum applications, immigration and emigration figures for European countries is the latest available data from Eurostat for the following countries: Austria, Belgium, Denmark, Finland, France, Germany, Greece, Ireland, Italy, Netherlands, Portugal, Spain, Sweden, Czechia, Estonia, Hungary, Latvia, Lithuania, Poland, Slovakia and Slovenia, Bulgaria, Romania, Norway, Switzerland and Croatia. Population figures for the UK are from ONS, National Records of Scotland and Northern Ireland Statistics and Research Agency 2024 mid-year estimates, and for Europe from Eurostat data as of 1 January 2024. In order to account for smaller populations and make European data comparable with the UK, when calculating figures for net migration and asylum applications, European countries with a population of less than one million have been excluded. Additionally, when calculating net migration, only countries which include asylum seekers or refugees in their immigration figures are included, these are: Austria, Belgium, Estonia, France, Germany, Greece, Ireland, Italy, Netherlands, Norway, Portugal, Slovenia, Spain, Switzerland. Aman Naseri, 18, denies endangering 46 people during a boat crossing to the UK on 5 January. Police described Adem Savas as \"without a doubt the most significant supplier\" to Channel people smugglers between 2019 and 2024. The government says it will help gather intelligence on smuggling gangs. It is the latest accident on one of the world’s most dangerous routes used by West Africans trying to reach Spain. The government hopes something similar to the Ukrainian resettlement scheme could be a solution. Copyright 2026 BBC. All rights reserved. The BBC is not responsible for the content of external sites. Read about our approach to external linking."
          ],
          "published_date": "01/07/2026, 08:56 AM, +0000 UTC",
          "source": {
            "name": "BBC",
            "icon": "https://encrypted-tbn2.gstatic.com/faviconV2?url=https://www.bbc.com&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL"
          },
          "thumbnail": "https://ichef.bbci.co.uk/news/1024/branded_news/a530/live/da608860-cb5a-11f0-a892-01d657345866.png",
          "_timestamp": 1767776160000
        },
        {
          "country": "Germany",
          "title": "Germany’s irregular immigration falls by half amid tougher border policies",
          "url": "https://www.visahq.com/news/2026-01-05/de/germanys-irregular-immigration-falls-by-half-amid-tougher-border-policies/",
          "snippet": "",
          "full_content": [
            "Choose how often you would like to receive our newsletter:"
          ],
          "published_date": "01/06/2026, 06:57 AM, +0000 UTC",
          "source": {
            "name": "VisaHQ",
            "icon": "https://encrypted-tbn2.gstatic.com/faviconV2?url=https://www.visahq.com&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL"
          },
          "thumbnail": "https://visa-hq-news-images.s3.us-east-1.amazonaws.com/news_images/additional_1_fb126828-8c3c-414f-8794-a5ec6703e015_middle.jpg",
          "_timestamp": 1767682620000
        },
        {
          "country": "Armenia",
          "title": "Kyrgyzstan Joins Kazakhstan, Uzbekistan, Tajikistan, Armenia, Azerbaijan, and Turkmenistan in Severely Affecting Visa-Free Stay Rules for Central Asian and Caucasus Travelers-Here’s The Most Important Factors You Should Know",
          "url": "https://www.travelandtourworld.com/news/article/kyrgyzstan-joins-kazakhstan-uzbekistan-tajikistan-armenia-azerbaijan-and-turkmenistan-in-severely-affecting-visa-free-stay-rules-for-central-asian-and-caucasus-travelers-heres-the-most-importan/",
          "snippet": "",
          "full_content": [
            "In a major shift in its immigration policy, Kyrgyzstan has announced significant changes to its visa-free stay rules for nationals of several countries. As of December 31, 2025, the government of Kyrgyzstan has reduced the length of stay for nationals from 55 countries, effectively shortening the time travelers can remain in the country without requiring a visa. Among the countries affected, Kazakhstan, Uzbekistan, Tajikistan, Armenia, Azerbaijan, and Turkmenistan will face the most severe changes. These countries, which had enjoyed long-standing visa exemptions or relaxed visa rules for their nationals, are now subject to more stringent regulations, potentially altering the travel experience for many in the Central Asia and Caucasus region. The decision by Kyrgyzstan to shorten the visa-free stay for nationals from Kazakhstan, Uzbekistan, Tajikistan, Armenia, Azerbaijan, and Turkmenistan is likely to have a profound impact on both regional mobility and bilateral relations. While the changes are aimed at improving immigration controls and enhancing the country’s security and transparency, they will undeniably affect travelers from these neighboring countries. For travelers planning to visit Kyrgyzstan, it is important to stay informed and adjust travel plans accordingly, ensuring that they comply with the updated visa requirements. The evolving immigration landscape in Kyrgyzstan reflects broader trends in Central Asia’s efforts to balance open borders with national security priorities",
            "Tags: Central Asia travel, immigration rules Kyrgyzstan, Kyrgyzstan visa changes, regional travel Central Asia, travel restrictions Kyrgyzstan I want to receive travel news and trade event updates from Travel And Tour World. I have read Travel And Tour World's  Privacy Notice ."
          ],
          "published_date": "01/06/2026, 01:47 AM, +0000 UTC",
          "source": {
            "name": "Travel And Tour World",
            "icon": "https://encrypted-tbn2.gstatic.com/faviconV2?url=https://www.travelandtourworld.com&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL"
          },
          "thumbnail": "https://www.travelandtourworld.com/wp-content/uploads/2026/01/create-an-image-showing-a-map-of-central_U6b_KVm2TgeH0KSH8WJf-Q_Ejcuf23xQuOtuWWmPIYwCA-850x567.jpeg",
          "_timestamp": 1767664020000
        },
        {
          "country": "Canada",
          "title": "Visa processing error by IRCC forces Halifax international student to stop studying, working",
          "url": "https://www.cbc.ca/news/canada/nova-scotia/chihiro-kondo-immigration-study-permit-application-dalhousie-student-9.7029400",
          "snippet": "",
          "full_content": [
            "Visa processing error forces Halifax student to stop working and studying An international student at Dalhousie University in Halifax is raising issues with Canada’s immigration process after she had to stop studying and working because of a visa processing error. Chihiro Kondo still cannot understand what happened when her application for a study permit extension was turned down in October, when she was told a document that had been submitted as part of the paperwork was missing. “I did everything correctly. I paid so much attention. I asked a lot of friends to review my documents. I was really overwhelmed,” Kondo, 25, said. In a letter to Kondo on Oct. 31, Immigration, Refugees and Citizenship Canada said her application had not been accepted and had been closed because a key document known as a provincial attestation letter, or PAL, was not included. Because of Canada’s cap on international students, the document is required to confirm study space has been approved by the province. Kondo said the oversight led to a stressful situation because she could no longer study or continue working as a teaching and research assistant since her previous study visa had expired. “I cried a lot. That was really hard,” she said, adding she has lost income and valuable time in class. Kondo, who arrived in Nova Scotia in 2021 and is now doing a master's degree in health promotion, sought help from a number of people, including her academic supervisor.",
            "“It was just awful when she came into my office on the Monday morning in floods of tears,” said Prof. Sara Kirk, who described Kondo as an “excellent student” and said the decision has also impacted her research. “I have funding that is from the federal government actually to do some research that Chihiro was supporting. And so I'm left without a member of staff.” Grants come with deadlines, Kirk said, so delays to projects can mean money going back to funders. “It's a system issue. There's no face behind the mistake that's been made. You're dealing with this bureaucratic mechanism,” Kirk said. Kirk contacted Halifax Chebucto MLA Krista Gallagher and Halifax MP Shannon Miedema for help and also reached out to CBC News after reading about issues in other high-profile immigration cases in the province. After being contacted by CBC, Immigration, Refugees and Citizenship Canada said in an emailed statement on Dec. 24 that \"IRCC can now confirm that the PAL was on file at the time of submission.” It said immigration officers individually assess applications to make certain specific requirements are met, but \"on occasion, human error may occur.\" The statement said Kondo submitted a “request for reconsideration as applicants should if they are concerned with a decision.” “I think they could have done it sooner but it's a good thing that they admitted it was their mistake,” she said.",
            "Kondo, who had been worried she would have to leave Canada, is now getting back to her studies and work. Gareth Hampshire began his career with CBC News in Edmonton. He is now based in Halifax. Get the latest top stories from across Nova Scotia in your inbox every weekday. The next issue of CBC Nova Scotia newsletter will soon be in your inbox.Discover all CBC newsletters in the Subscription Centre. This site is protected by reCAPTCHA and the Google Privacy Policy and Google Terms of Service apply. Audience Relations, CBC P.O. Box 500 Station A Toronto, ON  Canada, M5W 1E6 It is a priority for CBC to create products that are accessible to all in Canada including people with visual, hearing, motor and cognitive challenges. Closed Captioning and Described Video is available for many CBC shows offered on CBC Gem."
          ],
          "published_date": "01/05/2026, 06:43 PM, +0000 UTC",
          "source": {
            "name": "CBC",
            "icon": "https://encrypted-tbn1.gstatic.com/faviconV2?url=https://www.cbc.ca&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL",
            "authors": ["Gareth Hampshire"]
          },
          "thumbnail": "https://i.cbc.ca/ais/cabfafe4-d842-43b4-ad82-48aacd494198,1767034097346/full/max/0/default.jpg?im=Crop%2Crect%3D%280%2C0%2C2469%2C1388%29%3BResize%3D620",
          "_timestamp": 1767638580000
        },
        {
          "country": "India",
          "title": "US expands travel ban to 39 countries and raises immigration fees; India presses for faster H-1B processing",
          "url": "https://www.visahq.com/news/2026-01-02/in/us-expands-travel-ban-to-39-countries-and-raises-immigration-fees-india-presses-for-faster-h-1b-processing/",
          "snippet": "",
          "full_content": [
            "Choose how often you would like to receive our newsletter:"
          ],
          "published_date": "01/03/2026, 02:09 AM, +0000 UTC",
          "source": {
            "name": "VisaHQ",
            "icon": "https://encrypted-tbn2.gstatic.com/faviconV2?url=https://www.visahq.com&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL"
          },
          "thumbnail": "https://visa-hq-news-images.s3.us-east-1.amazonaws.com/news_images/8c772ed6-dcc7-43b2-a767-aa40d77fd933_middle.jpg",
          "_timestamp": 1767406140000
        },
        {
          "country": "Iran",
          "title": "New Trump-ordered immigration restrictions go into effect Jan. 1",
          "url": "https://abcnews.go.com/US/new-trump-ordered-immigration-restrictions-effect-jan-1/story?id=128812891",
          "snippet": "",
          "full_content": [
            "It comes amid new restrictions on H1-B visas that took effect Monday. Individuals from seven countries will not be able to travel to the United States starting Thursday, according to updated CBP guidance obtained by ABC News. Earlier this year, President Donald Trump signed executive orders limiting travel from Burkina Faso, Laos, Mali, Niger, Sierra Leone, South Sudan and Syria -- with those restrictions now going into effect Jan. 1. This applies to both immigrants and nonimmigrants, according to the CBO document dated Dec. 29. The White House says the restrictions are for national security and public safety reasons, while immigrant advocates say the ban targets African and Muslim countries. The travel ban continues restrictions on those from Afghanistan; Burma (Myanmar); Chad; Republic of the Congo; Equatorial Guinea; Eritrea; Haiti; Iran; Libya; Somalia; Sudan; Yemen from entering into the United States.",
            "There are also partial travel restrictions on people from Venezuela and Cuba, according to the document. It comes amid new restrictions on H1-B visas taking effect earlier this week. The H-1B visa program allows employers to hire noncitizens that have a specialized skill or trade and was previously done somewhat randomly. The changes the administration made, which went into effect on Monday, allow for a weighted system to prioritize individuals that would make a higher wage. \"The existing random selection process of H-1B registrations was exploited and abused by U.S. employers who were primarily seeking to import foreign workers at lower wages than they would pay American workers,\" said U.S. Citizenship and Immigration Services spokesman Matthew Tragesser. \"The new weighted selection will better serve Congress’ intent for the H-1B program and strengthen America’s competitiveness by incentivizing American employers to petition for higher-paid, higher-skilled foreign workers,\" Tragesser said. \"With these regulatory changes and others in the future, we will continue to update the H-1B program to help American businesses without allowing the abuse that was harming American workers.\"",
            "Rosanna Beradi, an immigration attorney, said the change will limit those who qualify. \"The change will severely limit the number of applicants who qualify under the H-1B program,\" she told ABC News. \"It will make it even harder for international students to remain in the U.S. after graduation, which will exacerbate the brain drain. The new rule effectively eliminates the lottery system and prioritizes high wage earners.\" There's 85,000 total H1-B visa applications, according to USCIS. It comes as the administration has prioritized tightening visa restrictions for other countries."
          ],
          "published_date": "12/31/2025, 10:22 PM, +0000 UTC",
          "source": {
            "name": "abcnews.go.com",
            "icon": "https://encrypted-tbn3.gstatic.com/faviconV2?url=https://abcnews.go.com&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL",
            "authors": ["Luke Barr"]
          },
          "thumbnail": "https://s.abcnews.com/images/US/donald-trump-3-rt-gmh-251230_1767102217004_hpMain_16x9_1600.jpg",
          "_timestamp": 1767219720000
        },
        {
          "country": "Australia",
          "title": "British man’s Australian visa cancelled after being charged with displaying Nazi symbols",
          "url": "https://www.theguardian.com/australia-news/2025/dec/24/british-man-australian-visa-cancelled-display-nazi-symbols-charge",
          "snippet": "",
          "full_content": [
            "Home affairs minister, Tony Burke, said the government had ‘no time for hatred when it came to cancelling visas’ Follow our Australia news live blog for latest updates Get our breaking news email, free app or daily news podcast The federal government has cancelled the visa of a British man charged with displaying prohibited Nazi symbols, after police seized swords bearing “swastika symbology” from his Queensland home last month. Federal police announced earlier this month that a 43-year-old United Kingdom citizen living in Queensland had been charged with three counts of allegedly displaying prohibited Nazi symbols, and one count of using a carriage service to menace, harass or cause offence.",
            "The AFP alleged in a statement on 8 December that the man used social media platform X to display a Nazi symbol and “espouse a pro-Nazi ideology with a specific hatred of the Jewish community, and to advocate for violence towards this community.” In the statement, police alleged that during a search of a Caboolture home on 21 November, they found “several weapons, including swords bearing swastika symbology, axes and knives.” “The AFP has alleged the man posted content that violated Commonwealth law on several occasions between 10 October, 2025, and 5 November, 2025. It is alleged X blocked the main account the man was using, which lead him to create a second handle with a similar name to continue posting offensive, harmful and targeted content,” the AFP said at the time. Home affairs minister, Tony Burke, confirmed on Wednesday that the man’s visa had been cancelled and the government was seeking his deportation. “I said some time ago that as far as freedom of speech was concerned, I had no time for hatred when it came to cancelling visas. If you come to Australia on a visa, you are here as a guest,” Burke told the ABC.",
            "“Almost everyone on a visa is a good guest and a welcome guest in our country. But if someone comes here for the purposes of hate, they can leave. And that’s what we’re doing.” Burke said proposed new hate speech legislation would increase his powers to make such visa cancellations, adding: “My view is an incitement of hate should be enough … we should be able to cancel visas on that basis alone.” The visa cancellation comes after Burke last month revoked the visa of South African Matthew Gruter, after his attendance at a neo-Nazi National Socialist Network rally outside New South Wales parliament in November. Burke at the time accused NSN members of seeking to cloak their “bigotry in patriotism”. Gruter later left Australia voluntarily, after being taken into immigration detention and facing deportation. Burke on Tuesday said he wants to shut down Islamist and far-right extremists like the NSN with a new regime for listing hate groups, which would operate nearly identically to the terror listing scheme."
          ],
          "published_date": "12/23/2025, 08:00 AM, +0000 UTC",
          "source": {
            "name": "The Guardian",
            "icon": "https://encrypted-tbn0.gstatic.com/faviconV2?url=https://www.theguardian.com&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL",
            "authors": ["Josh Butler"]
          },
          "thumbnail": "https://i.guim.co.uk/img/media/c97e86ca37c68fc1d8a3e189687da0d190a5f759/500_0_5000_4000/master/5000.jpg?width=465&dpr=1&s=none&crop=none",
          "_timestamp": 1766476800000
        },
        {
          "country": "Japan",
          "title": "Japan Announces Plans for Immigration Change",
          "url": "https://www.newsweek.com/japan-announces-plans-for-immigration-change-11261854",
          "snippet": "",
          "full_content": [
            "Japan is considering a major overhaul of its migrant labor programs in an effort to better address critical labor shortages in a number of industries. Long known for its strict immigration policies, Japan has been gradually relaxing visa regulations in recent years as its rapidly aging population puts pressure on the workforce. The government is particularly concerned about sectors such as manufacturing and transportation, which are struggling to recruit younger Japanese. The new proposal comes after three consecutive years of record-high numbers of foreign residents. Under the direction of Prime Minister Sanae Takaichi, the government is reviewing policies related to foreigners, including those who overstay their visas, amid local concerns about the growing numbers. Newsweek reached out to Japan’s Foreign Ministry by email for comment outside of office hours. The plan, presented to a panel of experts on Tuesday, would set a cap of 805,700 workers for the Specified Skilled Worker Type 1 (SSW1) program, according to local media, down from the 820,000 figure introduced in March 2024.",
            "The SSW framework is also set to expand, covering 19 industrial fields, including logistics warehouses, linen supply and resource recycling, as well as broader job categories in manufacturing and transportation. This reduction reflects government estimates of labor-saving benefits from digital technology and projected productivity gains, Nikkei reported. The government also announced plans to phase out the current Technical Intern Training Program—a system for inexperienced workers to gain skills and, if they meet strict criteria, transition toward longer-term visa status. Critics say the program has often been used as a source of cheap labor. The 805,700 workers admitted to the new Specified Skilled Worker System, which replaces the SSW and encompasses 19 fields, would be able to work for a renewable three-year period starting in fiscal year 2026. The government is also considering admitting a maximum 426,200 interns for a two-year period under the Employment for Skill Development Program, which would encompass 17 fields, for about 1.2 million foreign migrant workers in total.",
            "At the end of June, 333,123 people held SSW I status, while about 449,000 were technical interns, according to government data cited by the Japan Times. The JICA Ogata Research Institute, a think tank run by the government-run Japan International Cooperation Agency, estimated in a 2024 report that Japan will be short 770,000 workers out of the 4.19 million required by 2030, “highlighting the need for foreign human resources (HRs) as new players in socioeconomic development and regional revitalization in Japan.” Japan’s Cabinet is expected to make a decision by January. If approved, workers could start being onboarded under the new framework beginning in March 2027."
          ],
          "published_date": "12/23/2025, 08:00 AM, +0000 UTC",
          "source": {
            "name": "Newsweek",
            "icon": "https://encrypted-tbn3.gstatic.com/faviconV2?url=https://www.newsweek.com&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL",
            "authors": ["Micah Mccartney"]
          },
          "thumbnail": "https://assets.newsweek.com/wp-content/uploads/2025/12/GettyImages-643558688-1.jpg?w=1600&h=900&q=88",
          "_timestamp": 1766476800000
        },
        {
          "country": "Iran",
          "title": "Trump expands travel ban: What you need to know if you were born in Iran | Iran International",
          "url": "https://www.iranintl.com/en/202512229057",
          "snippet": "",
          "full_content": [
            "Being born in Iran—not just entering from there—is now affecting even Iranians already living in the United States in how immigration cases are being handled, attorney Ali Rahnama told Iran International. “For the first time, one of the first times in American history, what we’re seeing here is they’re not talking about only Iranian citizenship,” Rahnama said appearing on Eye for Iran podcast. “What they’re including in there is being born in Iran.” Rahnama said the change is being felt by non-citizens already inside the United States who are pursuing legal immigration pathways, including green cards, citizenship, asylum, and work authorization. He stressed that the shift does not stem from the passage of a new immigration law, but from how existing immigration processes are now being applied. “What has happened the last month from the last one policy is that the people who are inside the country who have applications pending… those applications are going to be halted now,” he said. The developments are unfolding alongside President Donald Trump’s expansion of his travel ban, a policy that restricts the entry of foreign nationals from certain countries into the United States. Iran remains among the countries subject to a full suspension of entry for both immigrant and non-immigrant visas. The proclamation is formally written to apply to foreign nationals outside the United States who do not already hold valid visas and does not revoke visas issued before its effective date. The Trump administration has defended the expanded restrictions as a national security measure, citing concerns about weak vetting, unreliable records, and corruption in some countries. The measures are being described by authorities as a pause rather than a denial, but Rahnama warned that for many people, the distinction offers little comfort. “What’s happening is a pause,” he said. “Basically, your application is not being processed and just sitting in there.” He said the consequences are particularly acute for Iranians living in the United States on temporary visas, where delays can directly jeopardize legal status. “If you are on a visa, you probably wouldn’t be able to renew that visa,” Rahnama said. “That simply means that you have to leave the country.” Rahnama also said the pause is not limited to early-stage cases. Some applications that were already approved, or close to completion, have been reopened or frozen. “Some of these cases that have already been either approved or in the process of an approval are being revisited,” he said, describing instances in which applicants were removed from naturalization oath ceremonies despite having passed interviews and background checks. Concerns over immigration processing inside the United States have also drawn scrutiny on Capitol Hill. More than 100 Democratic lawmakers have sent a letter to the Department of Homeland Security and US Citizenship and Immigration Services condemning the cancellation of naturalization ceremonies and the halting of immigration applications for nationals of countries covered by the travel ban. The lawmakers cited cases in which individuals were pulled out of oath ceremonies moments before becoming US citizens and demanded transparency about the scope and duration of the pause. Rahnama said prolonged delays can function as de facto denials for people already living in the United States, even without a formal rejection. “For some people, that just basically means they’re going to run out of time to be legally present in the US,” he said. “That looks like denial… it would effectively feel like it.” He added that the broader impact now extends beyond asylum seekers or people attempting to enter the country, increasingly affecting families and individuals who have built their lives in the United States under existing immigration rules. “Not only the asylum seekers this time are going to be affected,” Rahnama said. “The people inside are going to be heavily affected.” US Ambassador to Israel Mike Huckabee said Iran appears not to have fully absorbed the message of Washington’s strike on the Fordow nuclear facility during the Israel–Iran war in June. “I don’t know that (Iran) ever took (US President Donald Trump) seriously until the night that the B-2 bombers went to Fordow,” Huckabee said in an interview at a conference hosted by the Israeli security and foreign policy think tank Institute for National Security Studies. Addressing reports that Iran is attempting to rebuild Fordow, Huckabee said the apparent reconstruction efforts suggest the warning was insufficient. “I hope they got the message, but apparently they didn’t get the full message because, as you mentioned, they appear to be trying to reconstitute and find a new way to dig the hole deeper and secure it more,” he said. Israel launched strikes on Iranian nuclear and military targets on June 13, accusing Tehran of pursuing a covert nuclear weapons program — a charge Iran denies. The attacks were followed by 12 days of hostilities, with the United States joining with a one-off strike on Iranian nuclear facilities on June 22. Iran responded with missile strikes on a US air base in Qatar, saying it did not seek further escalation. Asked whether Washington would authorize another Israeli strike on Iran if Israel concluded such action was required, Huckabee referred to Trump’s repeated public position on Iran’s nuclear program. “All I can do is point you to what (Trump) has said repeatedly, and he consistently has said Iran is never going to enrich uranium, and they’re not going to have a nuclear weapon,” Huckabee said. Huckabee said any renewed effort by Iran to restore its nuclear or ballistic missile programs would have broader consequences beyond the region.",
            "“It presents a real threat to all of Europe,” he said. “And if the Europeans don’t understand this, then they’re even dumber than I sometimes think they are,” Huckabee added. Huckabee’s remarks come as International Atomic Energy Agency (IAEA) Director General Rafael Grossi said last week that the agency remains unable to access several of the country’s most sensitive nuclear sites following the June strikes. Grossi said the IAEA is “only allowed to access sites that were not hit” during the June war. “These other three sites—Natanz, Isfahan and Fordow—are even more significant, since they still contain substantial amounts of nuclear material and equipment, and we need to return there,” Grossi said. Huckabee warned that Tehran poses a threat to the United States as well. “The president has made it clear this isn’t only about Israel,” he said. “Iran’s ultimate objective is the United States.” Iranian state media reported missile drills in several cities on Monday, as Tehran said its missile program was strictly defensive against the backdrop of rising regional tensions and warnings from Israel. The semi-official Fars news agency, citing field observations and public reports, said missile tests were observed in multiple locations, including Tehran, Isfahan, Mashhad, Khorramabad and Mahabad. Iran’s state broadcaster and the semi-official Nournews published videos that appeared to show missile launches, without specifying the exact locations. Other reports said launches took place in Tehran, Isfahan and Mashhad. Earlier in the day, Foreign Ministry spokesperson Esmaeil Baghaei rejected any discussion of Iran’s military capabilities, saying the country’s missile program had been developed solely to defend Iran’s sovereignty and was not subject to negotiation. “Iran’s defensive capabilities are by no means an issue that can be discussed,” he said. The reports came a day after Axios said Israel had warned the United States that recent Iranian missile drills could be used as cover for preparations for a surprise attack, citing Israeli officials. US officials told Axios, however, that Washington currently saw no indication of an imminent Iranian strike. Tehran’s upcoming city council elections will be held under a proportional representation system for the first time, but widespread voter apathy has raised concerns of an extremely low turnout outside conservative ranks. The city and village council elections in May will also be held independently of the presidential race for the first time, a change that further distinguishes them from previous electoral cycles. City council contests are significant to political figures and groups in Iran because they have repeatedly served as springboards to national power, particularly the presidency. Tehran’s current hardline mayor, Alireza Zakani, rose through the city council before becoming mayor and later used that position as a launchpad for his bid in last year’s presidential election, though he was ultimately unsuccessful. Before him, Mahmoud Ahmadinejad famously moved from the Tehran mayoralty to the presidency, underscoring the political weight of municipal office in Iran. Voter disillusion and the risk of low participation Unlike all other elections in Iran, city council races are not supervised by the Guardian Council, an unelected body widely accused by critics of “engineering elections” in favor of conservatives and hardliners through mass candidate disqualifications. As a result, council elections have generally been freer than presidential and parliamentary contests over the past two decades. Even so, political analysts and activists say the depth of public frustration with elections and governance makes it unlikely that large segments of the electorate will return to the polls, with some warning that turnout could fall below levels seen five years ago, when only around 25 percent of eligible voters participated in Tehran. This is particularly true of the so-called “gray voters,” a broad and often decisive group whose participation has frequently tipped election outcomes in favor of reformists and moderates. Recent electoral experience reinforces these concerns. In the 2021 parliamentary elections, after most reformist candidates were disqualified, turnout in Tehran hovered around 10 percent. The top candidate in the capital won roughly 580,000 votes—about six percent of eligible voters. The reformist-leaning daily Arman-e Melli warned of the potential total marginalization of reformists and moderates under the new electoral model and prevailing voter apathy in an article titled “The Proportional Election Trap Facing Reformists.” “If conservatives enter the race with two lists and split their organized votes between them, while reformists fail to mobilize their political base, the total reformist vote could fall to third place. In such a scenario, even the complete exclusion of reformists from Tehran’s city council would not be far-fetched.” So far, there has been little visible enthusiasm among reformists for the upcoming vote. Conservatives and hardliners, by contrast, have been planning for months. Meanwhile, according to the centrist website Asr-e Iran, three conservative camps are already maneuvering aggressively: Mehrdad Bazrpash, a long-time rival of Tehran Mayor Alireza Zakani, is reportedly has an eye toward becoming Tehran’s next mayor by placing allies in the council, while supporters of Saeed Jalili and members of the hardline Paydari Front, and neo-conservative allies of parliamentary speaker Mohammad-Bagher Ghalibaf, also push for maximum seats. How proportional elections work—and why they matter",
            "Under the new model, seats are allocated based on the share of the total vote won by each party or coalition list, with independent candidates assessed according to their percentage of overall ballots cast. In practice, this means that in Tehran, organized political forces with disciplined voter bases—particularly conservatives and hardliners—are likely to benefit the most, while candidates without party backing face steep obstacles. While many political groups agree that proportional representation can, in theory, improve the performance of councils and municipalities, some argue that introducing it under current political and institutional conditions may produce the opposite effect. Opposition to the new model is not limited to any single political camp. Masoud Zaribafan, a former close ally of Mahmoud Ahmadinejad, has publicly warned against the risks. He said that if ideologically rigid and unqualified individuals enter the council, it will “certainly face serious problems in selecting a mayor—especially someone who intends to use the mayoralty as a springboard to a higher position, including the presidency.” He added: “Even if they manage to elect a mayor, I doubt they will be able to choose a powerful and efficient one.” Mohammad Mehdi Tondgouyan, a former Tehran council member close to reformists, argued that proportional elections make little sense in a country without deeply rooted parties. “Our people have no real connection with parties,” he said. Mahmoud Mir-Lohi, a senior member of the National Trust Party and a former deputy interior minister under President Mohammad Khatami, noted that Iran has around 200 registered parties, most of which function more like professional associations than genuine political organizations. Former parliamentary candidate Tina Amin echoed this concern in a post on X: “If proportional elections are applied based on the current party landscape, they will not solve the problems of majoritarian elections. Instead, they will reproduce party-based rent-seeking and a lack of meritocracy in a different form.” Norway’s foreign ministry on Monday confirmed the detention of one of its citizens in Iran, a spokesperson for the ministry told Iran International. \"The Ministry of Foreign Affairs is aware that a Norwegian citizen has been arrested in Iran, but due to our obligation to respect confidentiality we cannot provide further details,\" the spokesperson said. \"The Ministry of Foreign Affairs advises against travel to Iran,\" the spokesperson added. The ministry did not provide additional information, including the identity of the detainee or whether the person holds dual nationality. On Sunday, US-based rights group Human Rights Activists News Agency (HRANA) reported that an Iranian–Norwegian dual national was detained after being summoned to the Intelligence Ministry office in Saqqez, in Iran’s western Kurdistan province. HRANA identified the woman as Shahin Mahmoudi, whose name the rights group said appears as Shine Mahmoudi in Norwegian identity documents. Mahmoudi was summoned by phone to the Intelligence Ministry office in Saqqez last Sunday and was detained around noon after reporting to the security body, HRANA said. She was later transferred to the Intelligence Ministry’s detention center in the nearby city of Sanandaj. According to HRANA, authorities have not informed Mahmoudi’s family of the charges against her. Her relatives remain unaware of the reasons for her detention, her health condition, and the status of legal proceedings in her case, according to HRANA. Mahmoudi had traveled from Norway to Iran on November 28, a move that was followed by her detention and the opening of a judicial case against her, according to the report. The report comes just days after Sweden confirmed that one of its citizens was detained in Iran, after the country's judiciary disclosed details of a case involving an Iranian-Swedish dual national accused of spying for Israel. Israel is thinking about regime change in Iran as an option to avoid repeated rounds of conflict, former Israeli consul in Los Angeles said on Sunday. “Israel is thinking about the regime change in Iran, because otherwise we’ll have to go to a round after round after round,” Yaki Dayan said on Israel’s i24NEWS The Rundown program. Dayan said Israeli Prime Minister Benjamin Netanyahu will have to do significant convincing when he meets Trump later this month at Mar-a-Lago, particularly on backing further Israeli action against Iran. \"Netanyahu will have a lot of convincing here to do with Trump, not necessarily joining forces in another attack, but going to another attack and getting the defense capabilities from the Americans,\" he said. Dayan said Trump is “much more in the peacemaking mode than attacking mode” on Iran and views the nuclear program as a more immediate threat than Iran’s ballistic missile program, which he said Tehran is currently prioritizing. Dayan's remarks come as Israel Defense Forces’ (IDF) Chief of Staff Lt. Gen. Eyal Zamir said the force will strike its enemies “wherever required, on near and distant fronts alike,” in comments that appeared to allude to the possibility of further action against Iran. Zamir said Iran had built what he described as a “ring of strangulation” around Israel, a reference to Tehran-backed groups operating across multiple fronts, and warned that the military was prepared to act both close to home and farther afield."
          ],
          "published_date": "12/22/2025, 08:00 AM, +0000 UTC",
          "source": {
            "name": "ایران اینترنشنال",
            "icon": "https://encrypted-tbn0.gstatic.com/faviconV2?url=https://www.iranintl.com&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL",
            "authors": ["Negar Mojtahedi"]
          },
          "thumbnail": "https://i.iranintl.com/images/rdk9umy0/production/2faf5c4907130c222e86074065d4a13c91d2d37b-800x600.jpg?rect=51,14,749,499&w=576&h=384&q=80&fit=max&auto=format",
          "_timestamp": 1766390400000
        },
        {
          "country": "New Zealand",
          "title": "Immigration weekly update: December 18, 2025",
          "url": "https://www.crownworldmobility.com/insights/immigration-weekly-update-december-18-2025-2/",
          "snippet": "",
          "full_content": [
            "The U.S. government has introduced the Gold Card Visa Program, designed to attract individuals who can contribute significantly to the U.S. economy. Overseen by the Secretary of Commerce, the program offers expedited immigrant visas to foreign nationals who provide substantial financial gifts to the nation. This summary was prepared using the information from the White House Disclaimer: The above information is provided for general information purposes only and should not be construed as legal advice. If you have any further inquiries regarding the applicability of this information, please contact Joanna Sogeke (Immigration Team Leader). Immigration New Zealand has announced that with effect from December 8, 2025, applicants must provide a valid police certificate with their Accredited Employer Work Visa (AEWV) application. Immigration New Zealand will no longer accept a receipt or proof that an application for a certificate has been made. The change is being implemented to allow decisions to be made more quickly and reduce delays caused by missing supporting documents. Immigration New Zealand will no longer follow up on missing documents including police certificates. Processing staff will not hold applications open and will not request missing documents. Applications will now be assessed only on the information provided at lodgment. This means that incomplete applications may be delayed, approved for a shorter visa, or declined, depending on the individual circumstances. This summary was prepared using the information from the Immigration New Zealand Disclaimer: The above information is provided for general information purposes only and should not be construed as legal advice. If you have any further inquiries regarding the applicability of this information, please contact Debra Beynon (Regional Immigration Manager, APAC). Starting on January 1, 2026, employers in Germany will be required to inform third-country nationals with a local employment contract about their right to seek free legal advice on labour and social law matters. This information must be provided no later than the employee’s first working day. Employers can fulfil this obligation by providing an information sheet or an appendix to the employment contract that includes the contact details of a nearby counselling centre. It is recommended to hand over this information together with the employment contract and to obtain written confirmation of receipt. Using the advice service is voluntary and free of charge. The purpose of this regulation is to protect foreign workers from exploitation and discrimination, prevent wage dumping and unfair competition, and promote fair integration into the labour market. The obligation applies only to local employment contracts and does not cover secondments, where the responsibility lies with the agency In addition to this new requirement, employers must continue to comply with existing obligations. These include verifying the employee’s nationality and residence permit, retaining copies of identification documents and residence permits for the duration of employment plus three years, and notifying the immigration office within four weeks in case of premature termination of employment. Failure to comply with these obligations can result in fines of up to €30,000. This summary was prepared using the information from our Service Partner.",
            "A new regulation effective December 1, 2025, introduced few changes: The fees have increased significantly (all up from PLN 100): declarations now cost 400 PLN, work permits are set at 200 PLN for up to three months, 400 PLN for over three months, 800 PLN for delegations.  The fee for seasonal work permit is 100 PLN. The updated list of exemptions includes aid programmes, foreign language teachers, defence delegations, accredited journalists, artistic work, lectures, athletes (all subject to a 30-day annual limit), internships, researchers, medical professions, and graduates of Polish schools or universities, as well as PhD holders. Workers can be delegated to Poland by a foreign employer for no more than three months per year. This summary was prepared using the information from the The Office of Wielkopolska Province in Poznan Disclaimer: The above information is provided for general information purposes only and should not be construed as legal advice. If you have any further inquiries regarding the applicability of this information, please contact Joanna Sogeke (Immigration Team Leader). We track policy changes in over 120 countries. Find out how we can help you in this short video. Immigration news updates for Canada, China and France Immigration news updates for Australia, Denmark, Philippines and the United States Immigration news updates for Australia, India, Ireland, Malaysia, New Zealand and the United States Immigration news updates for Canada, Ireland, Poland and the United Kingdom",
            "Receive our monthly newsletter and stay up to date on a wide range of issues impacting mobility and employee relocations. By submitting this form you consent to the terms of our Privacy Policy and agree to receive relevant updates from Crown World Mobility. © Copyright document.write(new Date().getFullYear()) Crown World Mobility. All rights reserved. Use the log in below to access a generic version of our customer portal. For client specific versions of the portal see communications from your Crown consultant. Use the log in below to access our customer portal. Download our expert report today and discover emerging mobility trends In the second report in our three part series, we look at what shapes assignees relocation experience. In our podcast Culture Talks, we use stories and experiences, to bust myths around culture and spotlight its importance, especially when it comes to relocating around the world and moving abroad. Immigration news updates for Canada, China and France"
          ],
          "published_date": "12/18/2025, 08:00 AM, +0000 UTC",
          "source": {
            "name": "Crown World Mobility",
            "icon": "https://encrypted-tbn2.gstatic.com/faviconV2?url=https://www.crownworldmobility.com&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL"
          },
          "thumbnail": "https://www.crownworldmobility.com/wp-content/uploads/2021/01/IMG_03353.jpg",
          "_timestamp": 1766044800000
        },
        {
          "country": "Bhutan",
          "title": "United States | 13 countries now subject to State Department’s visa bond requirements",
          "url": "https://www.bal.com/immigration-news/united-states-13-countries-now-subject-to-state-departments-visa-bond-requirements/",
          "snippet": "",
          "full_content": [
            "As of Dec. 17, the State Department has updated its list of countries subject to visa bond requirements under the Temporary Final Rule Visa Bond Pilot Program, authorized by the Immigration and Nationality Act Section 221(g)(3), to include seven additional countries (Bhutan, Botswana, Central African Republic, Guinea, Guinea Bissau, Namibia and Turkmenistan) with implementation dates of Jan. 1, 2026. Additional Information: The launch of the visa bond pilot program was announced in August. The pilot will run for 12 months from Aug. 20, 2025, until Aug. 5, 2026. More details on the bond payment process, required ports of entry, visa bond compliance and visa bond breach can be found here. During the pilot, there will not be a waiver application process. This alert has been provided by the BAL U.S. Practice Group.",
            "Copyright © 2025 Berry Appleman & Leiden LLP. All rights reserved. Reprinting or digital redistribution to the public is permitted only with the express written permission of Berry Appleman & Leiden LLP. For inquiries, please contact copyright@bal.com. On Jan. 1, 2026, U.S. Citizenship and Immigration Services issued a new “hold and review” policy memorandum (PM-602-0194), effective… U.S. Citizenship and Immigration Services has implemented updated filing fees for certain immigration benefit requests, effective Jan. 1,…",
            "U.S. Customs and Border Protection (CBP) has issued an update to its Carrier Liaison Program (CLP), revising the list of… The proclamation issued on Dec. 16, 2025, expands and revises entry restrictions that impact nationals from 39 countries, effective as… ©2026 Berry Appleman & Leiden. All Rights Reserved.\n      Susan Wehrer, General Counsel."
          ],
          "published_date": "12/18/2025, 08:00 AM, +0000 UTC",
          "source": {
            "name": "BAL Immigration Law",
            "icon": "https://encrypted-tbn2.gstatic.com/faviconV2?url=https://www.bal.com&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL"
          },
          "thumbnail": "https://www.bal.com/wp-content/uploads/BAL-Library-News-Image-Dept-State-bldg-1120x336-1.png",
          "_timestamp": 1766044800000
        },
        {
          "country": "Afghanistan",
          "title": "Republicans are divided on Afghan immigrant policy after the National Guard shooting",
          "url": "https://www.npr.org/2025/12/16/g-s1-102301/trump-republicans-division-afghanistan-immigration",
          "snippet": "",
          "full_content": [
            "Afghan refugee girl Laylama is pictured during a September 2025 interview with AFP in Islamabad, where she was living after President Trump suspended refugee admissions to the U.S.\n                \n                    \n                    Farooq Naeem/AFP via Getty Images\n                    \n                \n                hide caption Some Republicans in Congress are splitting from the Trump administration over its crackdown on legal immigration from Afghanistan, especially for those migrants who helped U.S. war efforts there. Over the past year, the U.S. has paused visa and other programs for Afghan nationals, among others. Those already in the country have also been stripped of temporary permission to stay. Further immigration restrictions followed after an Afghan national was charged in the deadly shooting of a National Guard member in Washington, D.C., last month. Republican Sen. Thom Tillis, N.C., cautioned against a \"knee-jerk reaction\" that could block a number of Afghans with valid cases for temporary or permanent immigration status from coming to the U.S. \"One thing we've forgotten is how important that is for our special operators,\" Tillis said, referencing examples of his own constituents with deep attachments to Afghans abroad. \"It puts them in a more dangerous spot if we lose sight of that.\" Sen. Susan Collins, R-Maine, also worried about the impact on Afghans from the cuts. \"There are Afghan citizens who acted as guards, drivers, interpreters, cooks for our troops,\" Collins said. \"I've talked to veterans who have been very concerned about the safety of Afghans who have helped us. So I think the answer is more intensive and careful vetting than occurred during the Biden administration.\" The GOP divisions come as President Trump spent the bulk of his 2024 presidential campaign vowing to launch the largest deportation effort in American history. Some Republicans have also pushed back against changes to visa programs for migrant laborers and in favor of more permanent status for recipients of the Deferred Action for Childhood Arrivals program. Afghan soldiers who assisted U.S. troops have, in the past, enjoyed bipartisan support for their immigration cases. Meanwhile, Trump has promoted the idea that only some people are welcome in the U.S. \"I've also announced a permanent pause on Third World migration, including from hellholes like Afghanistan, Haiti, Somalia and many other countries,\" Trump said last week at an event in Pennsylvania.",
            "On his first day in office, Trump paused the refugee resettlement program, effectively stranding thousands of people already approved to come to the U.S. This included Afghans who had helped U.S. troops, immigration advocates said. Afghanistan was one of the top countries sending refugees to the U.S. in fiscal year 2024, according to Homeland Security Department data; out of just over 100,000 refugees admitted that year, 14,680 were from Afghanistan. Some Republicans first raised concern about the pause's impact on those who had assisted U.S. armed forces. The refugee program has since been significantly scaled back, and the target demographic for entrants is now white South Africans, according to the administration. In June, Trump added Afghanistan to a list of 19 countries for which travel to the U.S. would be restricted. And after the attack on National Guard members in D.C. around Thanksgiving, the Trump administration paused processing asylum cases, green cards and other immigration services for those from the countries listed in June's travel ban. It also paused processing all visas specifically for Afghans. Trump has argued that those who came from Afghanistan were not properly vetted under the Biden administration. Rahmanullah Lakanwal, the man charged in connection with the shooting, was admitted to the U.S. in 2021 under the Biden administration's Operation Allies Welcome program. He was then granted asylum earlier this year under the Trump administration. \"This animal would've never been here if not for Joe Biden's dangerous policies which allowed countless unvetted criminals to invade our country and harm the American people,\" White House spokeswoman Abigail Jackson said in response to a request for comment about the Republican divisions. It is not clear what could have been uncovered through additional vetting before Lakanwal arrived to the U.S. Homeland Security Secretary Kristi Noem has said the suspect could have been radicalized after coming to the U.S. At the same time, advocates have long criticized agencies such as the CIA and DHS for failing to provide resources, including for mental health, for Afghan soldiers transitioning to life in America after experiencing harrowing violence. Immigrant advocacy groups accuse lawmakers of ceding their power to the president when it comes to immigration policy. \"Instead of asserting its constitutional role, Congress has allowed itself to be sidelined, failing to provide meaningful oversight,\" Shawn VanDiver, the founder of the organization AfghanEvac, which advocates for Afghans who worked with U.S. troops, said during a press conference. \"Failing to modernize the asylum, refugee, or [special immigrant visa] systems. The vacuum they have left is being filled with fear-mongering, not facts; politics, not policy.\"",
            "Congress this year has passed very few immigration-related bills, mostly focusing on funding the Department of Homeland Security's enforcement efforts. Many other legislative efforts to facilitate or reform immigration processes have been at a standstill. But some Republicans are happy to leave immigration in the administration's hands. \"Primarily, that's an executive branch issue,\" Sen. James Lankford, R-Okla., who sits on the Homeland Security Committee, said about the vetting process of Afghans and other immigrants. \"Our staff are not the ones that are actually doing the vetting. The vetting process does exist and is out there. It's just a matter of its execution at this point.\" Republican leaders also appear aligned with the Trump administration on the topic. House Republicans stripped a bipartisan provision from the National Defense Authorization Act that would have brought back an office at the State Department that relocates Afghan refugees. The legislation passed the House last week and is set for a Senate vote this week. \"Republican leadership tanked months of bipartisan work,\" Rep. Sydney Kamlager-Dove, D-Calif., who introduced the provision, said in a statement. \"It is truly shameful that my Republican colleagues, some of whom served in Afghanistan and uniquely understand the debt we owe our allies, have once again put blind loyalty to Trump over American principles and obligations.\" Sen. Bill Cassidy, R-La., told NPR that one solution to the question of Afghan vetting would be to pass the \"Fulfilling Promises to Afghan Allies Act,\" which provides a pathway for Afghans to apply for legal permanent residency, following additional vetting, and is supported by senators of both parties. The bill was introduced in August, but has not seen a committee vote. \"I'd like to see the bill that I sponsored, which would have increased vetting on anybody applying here, to take effect before we make another decision,\" Cassidy said. Still, enthusiasm to tackle anything immigration-related in this Congress is low. John Cornyn, R-Texas, has in the past supported measures for special immigrant visas for Afghan military interpreters and translators. But he told NPR that now is not the right time to restart that conversation, without elaborating on his reasons."
          ],
          "published_date": "12/16/2025, 08:00 AM, +0000 UTC",
          "source": {
            "name": "NPR",
            "icon": "https://encrypted-tbn1.gstatic.com/faviconV2?url=https://www.npr.org&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL",
            "authors": ["Ximena Bustillo"]
          },
          "thumbnail": "https://npr.brightspotcdn.com/dims3/default/strip/false/crop/5682x3788+0+0/resize/1100/quality/50/format/jpeg/?url=http%3A%2F%2Fnpr-brightspot.s3.amazonaws.com%2F32%2Ff4%2F65a81c004250b4516e1b69175a7e%2Fgettyimages-2236362920.jpg",
          "_timestamp": 1765872000000
        },
        {
          "country": "Afghanistan",
          "title": "‘They fought for American values’: Afghan immigrants and advocates push back against Trump crackdown",
          "url": "https://www.theguardian.com/us-news/2025/dec/13/afghan-immigrants-trump-administration",
          "snippet": "",
          "full_content": [
            "The US has been punishing ‘an entire group’ since the arrest of an Afghan in the shooting of two national guard troops Afghan immigrants and advocates across the United States are pushing back firmly against the Trump administration’s most recent crackdown on legal immigration, saying the American government is punishing hundreds of thousands of people for the alleged actions of one man. Since the shooting of two national guard soldiers in Washington DC late last month, with the authorities charging an Afghan man as the suspect, the Trump administration has taken harsh action, especially against Afghans in the US, generating a mix of fear, outrage and defiance in the diaspora. The government has completely frozen asylum decisions at US Citizenship and Immigration Services (USCIS), paused visa and immigration applications filed by Afghans and, more widely, halted all legal immigration cases for nationals of 19 countries listed on its travel ban, including citizenship ceremonies. “The attacker hasn’t been put on trial, but the whole Afghan community has been labeled as guilty,” said Yahya Haqiqi, president of the Afghan Support Network in the US, an organization founded shortly after the fall of Kabul to Taliban control in 2021 that has helped thousands of Afghan refugees settle in Oregon. “There are folks that came here because they fought for American values in Afghanistan, and because of the action of one individual, they and the whole community are being harmed. They are scared of their future, of not knowing what’s going to happen tomorrow.” The administration also directed officials to re-investigate the cases of immigrants from those 19 countries who were granted legal status under the Biden administration, and reduced the validity period for work permits issued to several groups of immigrants, including asylum-seekers and refugees. Trump administration officials have argued the changes are necessary after federal authorities identified the suspect in the shooting of the national guard soldiers, one of whom died, as Rahmanullah Lakanwal, a 29-year-old Afghan evacuee who entered the US in September 2021 and was granted asylum in April 2025. The moves also come amid reports of stepped-up apprehensions by Immigration and Customs Enforcement (ICE) in some heavily Afghan communities. Afghans who spoke with the Guardian said they condemn the killing of national guard soldier Sarah Beckstrom and that they hope guardsman Andrew Wolfe fully recovers after being critically wounded. But, they said, the policy changes introduced by the administration are unnecessarily creating uncertainty for thousands of families fighting to stay in the United States. Shir Agha Safi said he worked as an intelligence officer alongside American forces fighting the Taliban in Afghanistan. He came to the US in 2022 as part of Operation Allies Welcome, the Biden administration effort to resettle tens of thousands of Afghan evacuees. Safi said he applied for a green card in 2023 through the special immigrant visa (SIV) program, which offers permanent residency to Afghans who supported the American war effort, as translators or in other roles. “I agree with the re-examination of green cards,” he said in a telephone interview with the Guardian last week – but not for the reasons the Trump administration is citing. “The US government should recognize the faces of those who served the US mission in Afghanistan,” he said. Safi is now the executive director of Afghan Partners in Iowa, a non-profit in Des Moines, where around 500 Afghan families settled after the 2021 evacuations.",
            "“Some are feeling a sense of betrayal in my community, of being marginalized, but I said that if they have not done anything wrong, they should not be afraid of the changes,” he said. Some 80,000 Afghan immigrants were granted humanitarian parole to enter the United States under Operation Allies Welcome. As of 2022, nearly 200,000 Afghan immigrants had been welcomed into the United States, with California, Virginia, Texas and New York being the states with the highest concentrations of Afghans. Haqiqi , in Oregon, said that Afghans in the Portland metro region “are scared of just living, they are scared of exposing themselves as Afghans, not just to immigration officials, but how people will react to them as part of their community”. Meanwhile, Safi added that in Des Moines, Afghans have been detained by federal immigration officials following the announcement of the sweeping changes to US immigration policies. The government defended the reason behind the reshaping of the process of asylum, visas and green cards, citing concerns for the safety of the country. “Military-age males were routinely flown into the United States before their identities and backgrounds were fully established, with the Biden administration asserting that thorough vetting would occur only after arrival,” said Tricia McLaughlin, assistant secretary for public affairs at the Department of Homeland Security. “Under the Trump administration, we have instituted rigorous, multilayered screening: mandatory biometric enrollment, comprehensive social-media vetting, expanded recurrent background checks, and a requirement for annual in-person reporting. The safety of Americans must come first.” In 2022, a report by the inspector general said that the National Counterterrorism Center had failed to use Department of Defense biometric data when vetting Afghan evacuees after the chaotic 2021 troop withdrawal. In June, a federal report that reviewed the participation of the Federal Bureau of Investigation (FBI) in the evacuation of Afghans since 2021 said: “When potential threats to national security were identified related to certain evacuees, we found that the FBI proactively used its investigative authorities and continuous identity discovery tools to mitigate those potential threats.” In the wake of the latest policy changes, Vermont’s governor, Phil Scott, a Republican, said: “The shooting in Washington DC is a painful reminder that people can become violent for inexplicable reasons, especially those involved in warfare. Although there’s no excuse for what happened, it’s also not fair to cast blame on an entire group of people who are doing the best they can to integrate into our communities and follow the American dream.” In a recent memo, USCIS confirmed it had paused all pending immigration applications from 19 countries on the travel ban, including Afghanistan. This means that those people with pending applications for green cards and other benefits, like Safi, are in limbo indefinitely, with their cases unable to move forward for the foreseeable future. Even before the new restrictions, only a small number of visas were issued to Afghans due to the inclusion of Afghanistan in the travel ban. The majority were special immigrant visas. According to a federal report, from January to March of 2025, there were more than 10,000 Afghan applicants seeking approval of special immigrant visas. That process has been brought to a complete halt since the shooting in Washington. Immigration lawyers and Afghan refugees are still scrambling to understand how the Trump administration’s new restrictions will be implemented and for how long. But what is clear is the far-reaching scope of the crackdown. The asylum pause, for example, could affect some 1.5 million applicants awaiting a decision on their cases. One of them is Freshta, a 29-year-old Afghan immigrant who came to the US in 2022 on a visa for highly qualified students. She asked for her real name to be withheld, citing fears about being targeted and ultimately deported by federal immigration officials amid the recent crackdown.",
            "Freshta said she applied for asylum with USCIS in the first months of 2023. But her case has been brought to a complete halt due to the pause in asylum decisions. “I came here the legal way. I came here because everyone said there was freedom of speech and I could pursue my dreams as an Afghan woman,” Freshta said in an interview over tea on a recent afternoon in New York City. “That doesn’t exist in Afghanistan. Everybody knows that women can’t go to school, can’t work, let alone have an opinion. See? I don’t wear scarves, I don’t follow the Taliban’s rule, so small things like these, if not kill me, would create a lot of challenges.” Decisions on the granting of asylum are made by the Department of Homeland Security. The Guardian reached out to the agency asking whether asylum applicants should expect their applications to be terminated, but the question wasn’t addressed. “I feel like I am getting close to who I was dreaming to be but it’s hard to be an immigrant now,” Freshta added. “If I speak the language, I pay taxes, I integrate into this society, what else can I do? I want a normal life, a normal human being with dignity.” The best public interest journalism relies on first-hand accounts from people in the know. If you have something to share on this subject, you can contact us confidentially using the following methods. The Guardian app has a tool to send tips about stories. Messages are end to end encrypted and concealed within the routine activity that every Guardian mobile app performs. This prevents an observer from knowing that you are communicating with us at all, let alone what is being said. If you don't already have the Guardian app, download it (iOS/Android) and go to the menu. Select ‘Secure Messaging’. SecureDrop, instant messengers, email, telephone and post If you can safely use the Tor network without being observed or monitored, you can send messages and documents to the Guardian via our SecureDrop platform. Finally, our guide at theguardian.com/tips lists several ways to contact us securely, and discusses the pros and cons of each."
          ],
          "published_date": "12/14/2025, 08:00 AM, +0000 UTC",
          "source": {
            "name": "The Guardian",
            "icon": "https://encrypted-tbn0.gstatic.com/faviconV2?url=https://www.theguardian.com&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL",
            "authors": ["Justo Robles"]
          },
          "thumbnail": "https://i.guim.co.uk/img/media/dcc7ff4f78ad829425141874c8425717c218f472/0_0_2850_1897/master/2850.jpg?width=465&dpr=1&s=none&crop=none",
          "_timestamp": 1765699200000
        },
        {
          "country": "Armenia",
          "title": "Germany to fast-track visas for Armenian travellers, PM Pashinyan says",
          "url": "https://www.visahq.com/news/2025-12-11/de/germany-to-fast-track-visas-for-armenian-travellers-pm-pashinyan-says/",
          "snippet": "",
          "full_content": [
            "Choose how often you would like to receive our newsletter:"
          ],
          "published_date": "12/12/2025, 08:00 AM, +0000 UTC",
          "source": {
            "name": "VisaHQ",
            "icon": "https://encrypted-tbn2.gstatic.com/faviconV2?url=https://www.visahq.com&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL"
          },
          "thumbnail": "https://visa-hq-news-images.s3.us-east-1.amazonaws.com/news_images/2252d2f8-c914-4167-9a13-85df0ca46036_middle.jpg",
          "_timestamp": 1765526400000
        },
        {
          "country": "Afghanistan",
          "title": "Afghans worried as Trump administration cracks down on their immigration to U.S.",
          "url": "https://www.houstonpublicmedia.org/articles/news/politics/immigration/2025/12/11/538334/trump-immigration-afghans-houston-ice-national-guard/",
          "snippet": "",
          "full_content": [
            "In the wake of a Thanksgiving week attack that left one National Guard member dead, the administration has gone from halting the processing of immigration requests to seizing and arresting some Afghan immigrants in their homes. To embed this piece of audio in your site, please use this code: President Donald Trump has frozen the processing of immigration requests for all Afghans, pending a review of security and vetting procedures. Many Afghan immigrants who came to the United States through the appropriate legal channels are growing increasingly worried about their status. The crackdown started the week of Thanksgiving, when an Afghan immigrant — Rahmanullah Lakanwal, who had worked with the CIA in his home country — allegedly shot two West Virginia National Guard members in Washington, D.C., Sarah Beckstrom and Andrew Wolfe. Beckstrom subsequently died from her injuries. There are roughly a quarter of a million Afghans in the United States, according to the Migration Policy Institute, including roughly 15,000 who have settled in the Houston area since 2021. It's unclear how many are still waiting for permanent status. Houston immigration attorney Ali Zakaria said many of them are scared. \"The Afghan community feels very concerned that they are being painted as shooters or terrorists or disloyal to the United States without any evidence. One shooter out of 250,000 people does not make the entire community murderers,\" Zakaria said. \"We're getting calls. Afghan clients are asking what will happen to us, and at this stage, we just don’t have any answers, because we don’t know how far the government will go based on its announcements.\" At 8 a.m. on the morning of Dec. 2, at their home in Hicksville, New York, Milad Nyazi woke up his wife, Sophia, to tell her that U.S. Immigration and Customs Enforcement (ICE) had arrived. Sophia Nyazi thought he was joking. But there were three ICE agents there to arrest Milad. When asked, they declined to produce a warrant, she said. \"And then they said that, ‘Ma’am, we have to take him into custody. We have to detain him regarding the shooting of last week with the Afghan parolee that shot the two National Guards,' ” Sophia Nyazi said. \"And then I said that, ‘That has nothing to do with him.'\" MORE: Andrew Schneider discusses this story on Houston Matters To embed this piece of audio in your site, please use this code:",
            "Sophia is a native-born U.S. citizen, the daughter of immigrants who came to the U.S. during the Taliban's first period in power. But she said Milad is an Afghan immigrant on humanitarian parole since 2021, in the process of applying for a green card, which offers permanent U.S. residency. The ICE agents refused to look at Milad's documentation, according to Sophia, who said they refused to let her go with them. They even balked at letting her and Milad's 3-year-old daughter kiss Milad goodbye, though they finally allowed it, she said. \"She finally hugged him and kissed him,\" Sophia Nyazi said, \"and then my husband’s eyes were red. We were all emotional. And then they covered his head, and they arrested him, put his handcuffs in front, and they took him away.\" The U.S. Department of Homeland Security has not commented when asked about immigration policy changes by the Trump administration and the reasons behind them. But in a statement to Houston Public Media specifically about Milad Nyazi’s case, Homeland Security Assistant Secretary Tricia McLaughlin said, “On December 2, 2025, ICE New York arrested Milad Nyazi, a 28-year-old criminal illegal alien from Afghanistan,” adding that he has two previous arrests for alleged domestic violence. Sophia Nyazi said the arrests were the result of a misunderstanding and that all charges were dropped. An exhaustive search of multiple databases turned up no other criminal records. And Milad has not been charged in relation to the Washington shooting, nor is there any evidence he had any involvement in that case. Shawn VanDiver is president of AfghanEvac, an organization dedicated to helping Afghans who assisted the U.S. during the war to resettle in the United States. He said, since the shooting in Washington, the Trump administration has shuttered almost all legal options for Afghan nationals to come to the United States. RELATED: Afghan nationals face setbacks to finding a permanent U.S. home in wake of D.C. shooting \"The only people that can get here right now are people who already had a visa in their passport. So, if you have a visa in your passport, you should get here as fast as you can,\" VanDiver said. \"Things are really bad for these folks.\" U.S. Sen. John Cornyn, a Texas Republican, had previously advocated strengthening and expanding the Special Immigrant Visa (SIV) program aimed at helping Afghans who had assisted the U.S. during the long war in their country to come to the U.S. and become citizens. But Cornyn, who is facing tough primary challenges from both Texas Attorney General Ken Paxton and Houston-area U.S. Rep. Wesley Hunt, recently defended the Trump administration's crackdown. \"This is just one example of the abuse of something called parole, which is supposed to be done on a case-by-case basis,\" Cornyn said, \"but which [former President] Joe Biden claimed to have the authority to deal categorically with tens of thousands of immigrants from other countries around the world and bring them to the United States, basically unvetted.\"",
            "Julia Gelatt, associate director of the U.S. Program at the Migration Policy Institute, said the claim that Lakanwal was unvetted, which members of the Trump administration have stated repeatedly, is untrue. Lakanwal underwent multiple background checks, first when he went to work with the CIA, then before he came to the U.S., then when he applied for asylum, Gelatt said. \"I think the challenge with vetting is that the U.S. government can vet what’s in someone’s background — who they associated with, whether they were involved in a terrorist organization, whether they have a criminal history — but the vetting can’t predict who is likely to commit a crime in the future, at least not in any kind of reliable way,\" Gelatt said. Annie Pforzheimer, who previously served as deputy chief of mission at the U.S. Embassy in Kabul, supported Gelatt's argument and said it's a mistake to blame the screening process. \"This was something people took really seriously,\" Pforzheimer said. \"So, vetting itself can’t fix everything. What you really need are support services for people who are here. That is something that apparently was lacking in this case.\" “They’re going to kill him, and I don’t want that happening” Pforzheimer said she was worried about what the Trump administration’s policy change would mean, not only for the Afghan community in the U.S., but for the future of U.S. diplomacy and security. “I owe my life as a diplomat who served in Kabul on two separate tours, to Afghan allies,” Pforzheimer said. “When we were there — with the military, with our embassy — we repeatedly made promises of friendship and alliance and collaboration, and as a country, if our word is meaningless, if our honor is meaningless, I am concerned about how we’re going to go forward in a complex world of international relations where your word means something, or has to mean something.” According to the ICE Detainee Locator website, Milad Nyazi has been moved to the Otero County Processing Center in Chaparral, New Mexico, more than 2,000 miles from his family’s home. His wife, Sophia, said she feels no one is helping them. She's still seeking an attorney to take Milad's case pro bono. \"I’m scared,” said. “If he gets shipped to Afghanistan, once the Taliban gets him, God knows what happens, because once they find out, they’re going to kill him, and I don’t want that happening.\" Houston Public Media is supported with your gifts to the Houston Public Media Foundation and is licensed to the University of Houston"
          ],
          "published_date": "12/11/2025, 08:00 AM, +0000 UTC",
          "source": {
            "name": "Houston Public Media",
            "icon": "https://encrypted-tbn3.gstatic.com/faviconV2?url=https://www.houstonpublicmedia.org&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL"
          },
          "thumbnail": "https://cdn.houstonpublicmedia.org/wp-content/uploads/2025/12/10165739/The-Nyazis-2.jpeg",
          "_timestamp": 1765440000000
        },
        {
          "country": "Israel",
          "title": "Turkish student who criticized Israel can resume research at Tufts after visa was revoked, judge rules",
          "url": "https://www.nbcnews.com/news/us-news/turkish-student-criticized-israel-can-resume-research-tufts-visa-revok-rcna248258",
          "snippet": "",
          "full_content": [
            "Morning Rundown: Trump defends ICE shooting, Russia reacts to U.S. tanker seizure, and Olympian’s comeback at age 20 BOSTON — A federal judge has allowed a Tufts University student from Turkey to resume research and teaching while she deals with the consequences of having her visa revoked by the Trump administration, leading to six weeks of detention. The arrest of Rümeysa Öztürk, a Ph.D. student studying children's relationship to social media, was among the first as the Trump administration began targeting foreign-born students and activists involved in pro-Palestinian advocacy. She had co-authored an op-ed criticizing her university's response to Israel and the war in Gaza. Caught on video in March outside her Somerville residence, immigration enforcement officers took her away in an unmarked vehicle. Öztürk has been out of a Louisiana immigrant detention center since May and back on the Tufts campus. But she's been unable to teach or participate in research as part of her studies because of the termination of her record in the government's database of foreign students studying temporarily in the U.S. In her ruling Monday, Chief U.S. District Judge Denise J. Casper wrote that Öztürk is likely to succeed on claims that the termination was \"arbitrary and capricious, contrary to law and in violation of the First Amendment.\" The government's lawyers unsuccessfully argued that the Boston federal court lacked jurisdiction and that Öztürk's Student and Exchange Visitor Information System record (SEVIS) record was terminated legally after her visa was revoked, making her eligible for removal proceedings. \"There's no statute or regulation that's been violated by the termination of the SEVIS record in this case,\" Assistant U.S. Attorney Mark Sauter said during a hearing last week. The Associated Press sent an email Tuesday seeking comment from Sauter on whether the government plans to appeal.",
            "In a statement, Öztürk, who plans to graduate next year, said while she is grateful for the court's decision, she feels \"a great deal of grief\" for the education she has been \"arbitrarily denied as a scholar and a woman in my final year of doctoral studies.\" \"I hope one day we can create a world where everyone uses education to learn, connect, civically engage and benefit others — rather than criminalize and punish those whose opinions differ from our own,\" said Öztürk, who is still challenging her arrest and detention. The then-30-year-old was one of four students who wrote the opinion piece in the campus newspaper. It criticized the university's response to student activists demanding that Tufts \"acknowledge the Palestinian genocide,\" disclose its investments and divest from companies with ties to Israel. Öztürk, who is Muslim, was meeting friends in March for iftar, a meal that breaks a fast at sunset during Ramadan, according to her lawyer, Mahsa Khanbabai. Her student visa had been revoked several days earlier, but she was not informed of that, her lawyers said. The government asserted that terminating her SEVIS record two hours after her arrest was a proper way of informing Tufts University about her visa revocation. A State Department memo said Öztürk's visa was revoked following an assessment that her actions \"'may undermine U.S. foreign policy by creating a hostile environment for Jewish students and indicating support for a designated terrorist organization' including co-authoring an op-ed that found common cause with an organization that was later temporarily banned from campus.\" Öztürk running out of time to pursue teaching, research goals Without her SEVIS status reinstated, Öztürk said she couldn't qualify as a paid research assistant and couldn't fully reintegrate into academic life at Tufts.",
            "\"We have a strange kind of legal gaslighting here, where the government claims it's just a tinkering in a database, but this is really something that has a daily impact on Ms. Öztürk's life,\" her attorney, Adriana Lafaille of the American Civil Liberties Union of Massachusetts, said in court. \"We are running out of time to make this right. Each day that goes by is a day that she is being prevented from doing the work that she loves in the graduate program that she came here to be part of. Each day that this happens is a day that the government is allowed to continue to punish her for her protected speech.\" Öztürk, meanwhile, has maintained a full course load and fulfilled all requirements to maintain her lawful student status, which the government hasn't terminated, her lawyer said. Record created to collect information on international students SEVIS is mandated by Congress in the Illegal Immigration Reform and Immigrant Responsibility Act of 1996 and administered by the director of Immigration and Customs Enforcement \"to collect information relating to nonimmigrant foreign students\" and \"use such information to carry out the enforcement functions of\" ICE. According to the U.S. Department of Homeland Security, when a SEVIS record is terminated, a student loses all on and/ or off-campus employment authorization and allows ICE agents to investigate to \"confirm the departure of the student.\""
          ],
          "published_date": "12/09/2025, 08:00 AM, +0000 UTC",
          "source": {
            "name": "NBC News",
            "icon": "https://encrypted-tbn1.gstatic.com/faviconV2?url=https://www.nbcnews.com&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL"
          },
          "thumbnail": "https://media-cldnry.s-nbcnews.com/image/upload/t_fit-560w,f_auto,q_auto:best/rockcms/2025-12/251209-rumeysa-ozturk-vl-159p-c6ab91.jpg",
          "_timestamp": 1765267200000
        },
        {
          "country": "Iran",
          "title": "Trump's immigration message collides with his welcome to World Cup fans",
          "url": "https://www.pbs.org/newshour/politics/trumps-immigration-message-collides-with-his-welcome-to-world-cup-fans",
          "snippet": "",
          "full_content": [
            "Your generous monthly contribution— or whatever you can give—will help secure our future. Seung Min Kim, Associated Press\n                \n                \n                    Seung Min Kim, Associated Press WASHINGTON (AP) — President Donald Trump will take center stage at Friday's World Cup draw in Washington, rolling out the welcome mat for teams and fans from around the globe at a time when his administration is expanding restrictions on travel to the United States for people from 19 countries and he has hardened his rhetoric against immigrants. The administration is betting that its push to expedite visa processing for visitors and the excitement about the matchups for next summer's tournament — hosted by the United States, Canada and Mexico — will outweigh concerns that Trump's immigration messaging undercuts the theme of global unity that the World Cup is meant to represent. In the past week, Trump has said he wants to permanently pause immigration from poor countries and he has singled out Afghans and Somalis for particular contempt. The Republican president is also overseeing the signing a peace agreement between Rwanda and Congo on Thursday at an event with leaders from a host of foreign countries and he is expected to be honored for his peacemaking efforts by FIFA, international soccer's governing body, during the World Cup draw. \"The Cup is supposed to be a moment when the world comes together, puts aside the differences to celebrate sport, and while it symbolizes the world coming together, you have a president of the United States who is trying to keep the world out, to keep people out,\" said Sen. Chris Van Hollen, D-Md., a member of the Senate Foreign Relations Committee. \"Right there at the most fundamental level, you have a president who represents everything that the World Cup does not stand for,\" Van Hollen said. But Andrew Giuliani, the executive director of the White House FIFA task force, told foreign reporters Wednesday that \"there is a fictional narrative out there that the president is not welcoming to foreigners to come into the United States\" and he dismissed concerns about Trump's rhetoric. \"He's a New Yorker like me; sometimes we say things that are a little different than polished politicians say,\" Giuliani said. Trump's administration is preparing to expand a travel ban enacted in June. Homeland Security Secretary Kristi Noem said Monday that she plans to recommend a \"full travel ban on every damn country that's been flooding our nation with killers, leeches, and entitlement junkies.\" The restrictions have ensnared two countries that have qualified for the quadrennial tournament — Iran and Haiti. The ban bars entry to the U.S. for citizens from 12 countries, and there are heightened restrictions for visitors from seven others. READ MORE: FIFA to award new peace prize at World Cup draw in Washington",
            "The ban includes exceptions for World Cup athletes, coaches, \"persons performing a necessary support role\" and their immediate relatives. Fans, a major source of tourism revenue for any World Cup event, from those banned nations cannot enter. Iran has said it will boycott the draw at the Kennedy Center after visas were denied to key members of its delegation. But its soccer federation says the coach, Amir Ghalenoei, will be there with one or two staff members to ensure Iran's seat is not left vacant. Federation spokesman Amir-Mahdi Alavi told YJC.ir, a news agency affiliated with Iran's state TV, on Wednesday that Ghalenoei's attendance was purely technical and did not amount to walking back the federation's protest. Alavi said in initially announcing the boycott that federation officials faced visa obstacles that went beyond sports considerations. The White House referred comment on the matter to the State Department, which said the administration is committed to supporting the World Cup while upholding U.S. law and ensuring national security and public safety. \"Part of the delegation got approved and part of the delegation did not get approved,\" Giuliani said. \"Every single decision is a national security decision.\" The visa denials came despite assurances earlier this year by Gianni Infantino, the FIFA president who has close ties to Trump and is a frequent White House visitor. In October, he told reporters at a European Football Clubs assembly in Rome that \"there will be no issues with regard to visas obviously for the participating teams and delegations and so on. And we are working on something for fans, hopefully some good news will come out very soon.\" The White House has emphasized it is pouring resources to expedite visa processing elsewhere for fans coming to 48-nation tournament, with the majority of the matches held across 11 U.S. cities. Rep. Darin LaHood, who has participated in multiple FIFA task force meetings at the White House this year and is one of Capitol Hill's most avid soccer fans, pointed to shortened visa wait times as proof of the administration \"wanting to make this work and wanting people to come here.\" \"I think sports and the World Cup transcends politics,\" said LaHood R-Ill. He said FIFA will be part of a new public relations campaign featuring soccer legends emphasizing the welcoming nature of the United States. Subscribe to Here’s the Deal, our politics\n                 newsletter for analysis you won’t find anywhere else. \"There has to be a welcoming message of people feeling comfortable to come to the United States,\" LaHood said. \"I think you'll start to see that after the draw and things are set.\" The State Department has deployed more than 400 additional consular officers to handle global visa demand, and Secretary of State Marco Rubio has said that in about 80% of the world, travelers to the U.S. can get a visa appointment within 60 days. A new system, \"FIFA Pass,\" allows those who have purchased World Cup tickets through FIFA to get expedited visa appointments.",
            "Yet there have been very visceral reminders of how the administration's immigration crackdown could interfere with World Cup events. During the Club World Cup tournament this summer, Alex Lasry, the CEO of the New York/New Jersey World Cup host committee, noticed official government social media posts warning that federal immigration agents would be \"suited and booted\" at the matches. Lasry recalled that he immediately flagged the issue to Giuliani, who assured him that the agents' presence would be the same as at any other major event. Asked on Wednesday about the possibility of immigration raids at World Cup matches, Giuliani told reporters that Trump \"does not rule out anything that will help make American citizens safer.\" Some fans are already confronting the reality that they will not be able to travel to the United States. Rich André, the director of state and local initiatives at the American Immigration Council, is the son of immigrants from Haiti, a \"soccer-crazed nation\" that qualified for the World Cup for the first time in 50 years. He said many Haitians would love nothing more than to come to the U.S. for the World Cup, but likely will not get the chance. \"Certainly, they're trying to create a carve-out here so the show can go on,\" André said, pointing to the exemptions for athletes, coaches and others close to the team. \"But the show doesn't go on without the fans being able to come and cheer their team on in person.\" Associated Press writer Amir Vahdat in Tehran, Iran, AP Sports Writer Graham Dunbar in Geneva, and AP Diplomatic Writer Matthew Lee contributed to this report. Left:\n                FILE PHOTO: U.S. President Donald Trump wears a 'Trump Was Right About Everything!' hat while holding the FIFA World Cup Trophy, as he makes an announcement on the 2026 FIFA World Cup, in the Oval Office at the White House in Washington, D.C., U.S., August 22, 2025. Photo by Jonathan Ernst/REUTERS Seung Min Kim, Associated Press\n                \n                \n                    Seung Min Kim, Associated Press Subscribe to Here’s the Deal, our politics\n                 newsletter for analysis you won’t find anywhere else. © 1996 - 2026 NewsHour Productions LLC. All Rights Reserved."
          ],
          "published_date": "12/04/2025, 08:00 AM, +0000 UTC",
          "source": {
            "name": "PBS",
            "icon": "https://encrypted-tbn1.gstatic.com/faviconV2?url=https://www.pbs.org&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL",
            "authors": ["Seung Min Kim"]
          },
          "thumbnail": "https://d3i6fh83elv35t.cloudfront.net/static/2025/12/2025-11-19T141555Z_1713990958_RC2ICGAM5JSM_RTRMADP_3_USA-TRAVEL-FIFA-2026-1024x683.jpg",
          "_timestamp": 1764835200000
        },
        {
          "country": "Japan",
          "title": "Japan | Visa issuance fees to rise in fiscal year 2026",
          "url": "https://www.bal.com/immigration-news/japan-visa-issuance-fees-to-rise-in-fiscal-year-2026/",
          "snippet": "",
          "full_content": [
            "The Japanese government announced it will substantially raise visa issuance fees for foreign residents by 500%-900% in fiscal year 2026. This alert has been provided by the BAL Global Practice Group. Copyright © 2025 Berry Appleman & Leiden LLP. All rights reserved. Reprinting or digital redistribution to the public is permitted only with the express written permission of Berry Appleman & Leiden LLP. For inquiries, please contact copyright@bal.com.",
            "On Jan. 1, 2026, U.S. Citizenship and Immigration Services issued a new “hold and review” policy memorandum (PM-602-0194), effective… U.S. Citizenship and Immigration Services has implemented updated filing fees for certain immigration benefit requests, effective Jan. 1,… U.S. Customs and Border Protection (CBP) has issued an update to its Carrier Liaison Program (CLP), revising the list of…",
            "The proclamation issued on Dec. 16, 2025, expands and revises entry restrictions that impact nationals from 39 countries, effective as… ©2026 Berry Appleman & Leiden. All Rights Reserved.\n      Susan Wehrer, General Counsel."
          ],
          "published_date": "12/01/2025, 08:00 AM, +0000 UTC",
          "source": {
            "name": "BAL Immigration Law",
            "icon": "https://encrypted-tbn2.gstatic.com/faviconV2?url=https://www.bal.com&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL"
          },
          "thumbnail": "https://www.bal.com/wp-content/uploads/BALCountryOverview_Japan.webp",
          "_timestamp": 1764576000000
        },
        {
          "country": "Indonesia",
          "title": "Indonesian Immigration Shares Important Clarification For Bali Tourists",
          "url": "https://thebalisun.com/indonesian-immigration-shares-important-clarification-for-bali-tourists/",
          "snippet": "",
          "full_content": [
            "Post may contain affiliate links; we may receive compensation if you click links to those products. This may impact how offers are presented. Our site does not include all offers available. See our Disclosure & Privacy Policy for more info.Content on page accurate as of posting date. Immigration in Indonesia can be a confusing space to navigate. From eVisas to Hybrid Extension Applications, from Stay Permits to Global Citizen Residency, there is a whole heap of terminology to get up to speed with. This is why at The Bali Sun we share regular updates summarising Indonesian Immigration policies, as well as the breaking travel and immigration news. Indonesian Immigration has issued a necessary clarification for foreign nationals in the country. The clarification is simple but crucial for those who are set to navigate the immigration system more deeply. The differentiation Indonesia Immigration wants to make clear is between a visa and a stay permit. Indonesia Immigration has issued this update in as simple terms as possible, sharing the key differences in summary: “Visa: Permission to enter the country. Obtained before arrival. Stay Permit: Permission to reside in the country. Obtained after arrival.” This is as straightforward as it seems, but the implications of getting these two immigration categories mixed up could be costly. A post shared by Directorate General of Immigration (@indonesiaimmigration) Indonesian immigration has explained, “Both a visa and a stay permit are fundamental documents required for foreign nationals to legally reside in a country for a specified period. While both serve the purpose of allowing foreigners entry and stay within a country, they differ significantly in terms of their function, duration, and requirements.” Adding “A visa typically grants initial entry into a country for a specific purpose, while a stay permit regulates the terms and conditions for longer-term residence or extended stays. Understanding the distinction between these two documents is crucial for ensuring compliance with immigration laws and policies.” Understanding the definition of a visa and the definition of a stay permit, as observed by Indonesia Immigration, can help foreigners understand how these two essential documents work together. As the Indonesian Immigration explains, “A visa functions as an entry ticket or proof of permission for a foreigner to enter Indonesia for the first time. A visa is also required to activate a stay permit at the immigration checkpoint.” A post shared by Kantor Imigrasi Palembang (@imigrasi_palembang)",
            "Whereas a Stay Permit allows a foreigner to legally reside in Indonesia for a specific duration. In simple terms, it defines how long a foreign national can stay in the country after entering with a visa.” One of the key differences is that a visa typically offers single-entry permission to Indonesia, whereas a stay permit allows foreigners more flexibility in their access to Indonesia, in terms of entering and exiting the country, and stipulates what activities they are permitted to engage in, including work, business, investment, or travel and leisure. For most holidaymakers visiting Bali for 30 days or less, the differentiation between a visa and a stay permit is not as important as for those who are moving to Indonesia to work, start a business, or live on a more permanent basis. The most appropriate visa for most holidaymakers visiting Bali is the 30-day eVisa on Arrival, which can be applied for prior to touching down in Indonesia via the Official eVisa website. The visa costs IDR 500,000 per person, and tourists from Australia, New Zealand, most European nations, China, India, and the USA can all apply for this visa. Indonesia scrapped visa-free travel for most of Bali’s most frequent international arrivals after the pandemic; however, with a new agreement between Indonesia and South Africa offering visa-free travel to Indonesia for South African passport holders, there are glimmers of hope that more visa-free travel could be rolled out again in the future. At present, tourists from Brunei Darussalam, Cambodia, Laos, Malaysia, Myanmar, the Philippines, Singapore, Thailand, Timor Leste, Vietnam, Hong Kong, Macao, and South Africa are eligible for a 30-day visa-free stay in Indonesia. Foreigners from all other nations must visit the Indonesia eVisa website prior to their travel to understand which visa is most appropriate for them and make the relevant applications. Remove All Ads & Unlock All Articles… Sign up for The Bali Sun Premium Plan Your Bali Holiday: Book The Best English Speaking Drivers For Airport Transfers & ToursChoose From Thousands of Bali Hotels, Resorts, and Hostels with Free Cancellation On Most PropertiesBook Cheap Flights To BaliDon’t Forget Travel Insurance That Covers Medical Expenses In Bali For the latest Bali News & Debate Join our Facebook Community Enter your email address to subscribe to The Bali Sun’s latest breaking news, straight to your inbox.",
            "Subscribe to get the latest posts sent to your email. Bali’s Best Jungle Resorts Highlight Island’s Evergreen Charms For Tourists Major Airlines Are Ensuring Bali-Bound Passengers Pay Tourism Tax Δdocument.getElementById( \"ak_js_1\" ).setAttribute( \"value\", ( new Date() ).getTime() ); \"Immigration in Indonesia can be a confusing space to navigate. From eVisas to Hybrid Extension Applications, from Stay Permits to Global Citizen Residency, there is a whole heap of terminology to get up to speed with.\"\nNot just confusing to navigate. Add corrupt, inept, unaccountable, ridiculous and ever changing.\nBureaucratic madness. So easy to get voa at the airport nowadays, plenty of desks and good staff but the 500k comes with a admin charge of 65rup but still it's easy-to-use and the egates work well Madness of bureaucracy, and after that it’s not even allowed to smoke a joint for relaxation, otherwise perhaps death penalty or long Bali “holiday” in jail. I never use agents so I'm well aware of the complexities. Foreigners without local language skills are more or less forced to use \"agents\" that are important part of the bloodletting of foreigners with their exorbitant fees. Exorbitant as many want a piece. I use an agent. I'm happy to pay the their fee.\nTHey're not blood suckers nor is their fee exhorbitant. Enter your email address to subscribe to The Bali Sun’s latest breaking news affecting travelers, straight to your inbox. Subscribe now to keep reading and get access to the full archive."
          ],
          "published_date": "11/27/2025, 08:00 AM, +0000 UTC",
          "source": {
            "name": "The Bali Sun",
            "icon": "https://encrypted-tbn0.gstatic.com/faviconV2?url=https://thebalisun.com&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL"
          },
          "thumbnail": "https://thebalisun.com/wp-content/uploads/2025/11/Indonesia-Immigration-Shares-Important-Clarification-For-Bali-Tourists-.jpg",
          "_timestamp": 1764230400000
        },
        {
          "country": "Japan",
          "title": "Don’t believe everything you read in the media about Japan’s strong anti-immigrant sentiment",
          "url": "https://www.lowyinstitute.org/the-interpreter/don-t-believe-everything-you-read-media-about-japan-s-strong-anti-immigrant",
          "snippet": "",
          "full_content": [
            "Published daily by the\n      \n        Lowy Institute Social pressure pushes people to sound tougher on immigrants than they feel. Japan’s Prime Minister Sanae Takaichi plans to tighten measures related to foreign tourists and residents in Japan. She pledged stricter immigration policies during the Liberal Democratic Party presidential race and they form part of the coalition agreement with the Japan Innovation Party, which includes the formulation of a “population strategy” by the end of fiscal year 2026, including numerical targets for accepting foreigners. Takaichi has ordered relevant ministries to draft revisions of policies affecting foreigners by January 2026, with expectations this will address unpaid pension and health insurance premiums, visa overstays, land purchases and illegal logging. Foreigners who fail to pay their insurance premiums may be denied residence status renewals or changes. Takaichi said the public feels “anxiety and a sense of unfairness” over “illegal actions” by some foreigners, although she recognised the need for foreigners amid labour shortages. Kimi Onoda, the minister in charge of “a society of well-ordered and harmonious coexistence with foreign nationals”, has offered even tougher remarks. Onoda argued that the actions by a small number can “cause reputational damage for the rest,” and strong enforcement is needed to ensure that “discriminatory views are not targeted at foreigners who are working hard and properly.” She also said that the government will “create a situation in which foreigners who do bad things will no longer exist in Japan”. According to the results of the latest Asahi Shimbun telephone survey published on 17 November, 66% of respondents viewed Takaichi’s tougher immigration policies as promising, while 24% expressed concern. 56% said Japan needs fewer visitors and immigrants, compared with 26% who said the country needs more.",
            "While these figures suggest strong anti-immigrant sentiments, how accurately do these survey results reflect true beliefs? Several studies have shown that anti-prejudice norms prevail in North America and Western Europe. In these democracies, people often hide negative attitudes toward immigrants and ethnic minorities because expressing such views can lead to formal or informal sanctions, including reputational harm. In other words, social desirability works in favour of immigrants. These anti-prejudice norms, however, are not everywhere. Japan offers a unique case, where pro-prejudice norms prevail. With a far smaller immigrant population of around 3%, fewer ethnic minorities and a wide belief in ethnic homogeneity, social expectations push in the opposite direction. Here, social desirability works against immigrants. A study conducted by researchers at the University of Tokyo and Osaka University offers insights. It compares responses to direct questions – which contain social desirability bias – with list experiments to ensure anonymity. The aim is to reveal true beliefs by having a control group which receives only insensitive questions, and a treatment group which also receives the target question. The results show that Japanese respondents express more than 20% more negative attitudes toward immigrants when their responses are visible to researchers compared to their privately held beliefs. On the direct question, 59.2% of respondents agreed to restricting immigration, while in the list experiment, only 32.6% agreed. Meanwhile, on the direct question, 79.3% opposed Chinese and 73.2% opposed South Koreans. In the list experiment, opposition falls to 54.3% for Chinese and 42.7% for South Koreans. In both cases, negative sentiment toward Chinese residents is higher. The study also finds that respondents with higher education levels are no less susceptible to the pro-prejudice norm. Japan faces a paradox: while its demographic and economic challenges require immigrants, social pressures compel the public to express only ambiguous support for them.",
            "The gap between survey responses and true beliefs can become wider when the government tightens rules on foreigners, when there are ongoing diplomatic and economic disputes, and during surges in online anti-immigrant rhetoric. An example is the backlash following Takaichi’s remark in the Diet on 10 November suggesting that a Taiwan Strait conflict could constitute a “survival-threatening situation” under Japan’s 2015 security laws, potentially allowing the deployment of collective self-defence forces. The remark drew strong protests from Chinese officials and prompted a series of punitive measures, including travel and study warnings, free flight cancellations and changes by airlines, and the suspension of Japanese seafood imports. The dispute has, in turn, fuelled a surge of online anti-Chinese sentiment in Japan. Therefore, although recent media reports suggest strong anti-immigrant sentiment in Japan, these figures – derived from direct questions rather than list experiments – are likely inflated. Media surveys, especially those using telephones, place respondents under pressure to conform to the long-standing pro-prejudice norm and exaggerate their negative attitudes. Recent heightened diplomatic tensions with China and the push for stricter rules on foreigners has further contributed to this inflation. Even as Japanese people acknowledge the need for foreigners to offset population aging, declining birth rates and labour shortages, social pressure encourages them to express more negative views toward immigrants in public. Therefore, Japan faces a paradox: while its demographic and economic challenges require immigrants, social pressures compel the public to express only ambiguous support for them. More broadly, the discussion reminds us not to take any survey results – including cabinet and party approval ratings – at face value but to consider the methodology and sampling process behind them. Get the latest commentary and analysis on international events from experts at the Lowy Institute and around the world. The Interpreter features in-depth analysis & expert commentary on the latest international events, published daily by the Lowy Institute."
          ],
          "published_date": "11/27/2025, 08:00 AM, +0000 UTC",
          "source": {
            "name": "Lowy Institute",
            "icon": "https://encrypted-tbn1.gstatic.com/faviconV2?url=https://www.lowyinstitute.org&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL",
            "authors": ["Peter Chai"]
          },
          "thumbnail": "https://www.lowyinstitute.org/sites/default/files/styles/interpreter_article_image/public/2025-11/GettyImages-2238707191.jpg?itok=rBwJUaeY",
          "_timestamp": 1764230400000
        },
        {
          "country": "Armenia",
          "title": "Armenia to Launch 5-Year Fast-Track Residency in Immigration Overhaul",
          "url": "https://www.imidaily.com/program-updates/armenia-to-launch-5-year-fast-track-residency-in-immigration-overhaul/",
          "snippet": "",
          "full_content": [
            "Armenia will overhaul its residency system with a digital-first reform that introduces an investor fast track to permanent residence, aiming to attract capital and modernize migration management. The changes take effect on August 1, 2026, and will impact nearly all foreign residents, from investors and entrepreneurs to diaspora Armenians returning home. At the center of the reform is a new investment-based pathway that grants immediate permanent residence, which will be issued as a five-year card with renewal options and no requirement for physical presence to maintain the residence. The general requirement to qualify for citizenship remains unchanged, requiring at least three years of permanent residence in Armenia, with no single absence abroad exceeding six months. It is currently unclear whether the same citizenship criteria would apply to fast-track residency investors or whether they may qualify for an expedited or special-conditions naturalization route. The investor fast track replaces the outgoing 10-year “special residency” program. The government has not yet set the qualifying investment thresholds or categories for the new track, but it has pledged to publish them before the law takes effect mid-next year. For those who qualify, the investor route will eliminate the wait that usually precedes permanent status. Temporary residence for business will remain available in one-year increments, with a standard path to permanent residence after three years of documented activity and tax compliance. Ethnic Armenians will continue to have a direct route to permanent status based on heritage, without any investment requirement. After August 1, 2026, authorities will stop issuing new “special passports.” Existing holders will keep their status until their documents expire. Ethnic Armenians and investors will instead transition to the five-year permanent residence card.",
            "“This is territory Armenia hasn’t charted before,” said Astghik Pepanyan, senior business development consultant at Vardanyan & Partners. She says that because Armenia has not previously run an investment-based residency program, “it’s difficult to predict” the qualifying amounts and criteria at this time. But within a “couple of months,” she expects the government to announce minimums, eligible asset classes, such as businesses, real estate, or securities, and maintenance rules to keep the investment active for the card’s validity. Until August 1, 2026, the current regime remains in effect, which likely means that this is the last call for the 10-year special residency. From that date forward, the new law will govern all filings and renewals. Authorities say they will continue to process pending applications filed earlier under the old rules. Get investment opportunities, policy updates, and high-signal news from directly in your inbox each week. As a special gift, we’ll even send you a free copy of 13 Special Regimes for Low-Tax Living in High-Tax Europe. Trusted by 300,000+ investors, professionals, and global citizens",
            "South Korea proposes freezing crypto accounts on suspicion alone. One critic calls it “political intent,” not real policy. A forgotten relic of Soviet governance created a loophole that Russians utilized once the CBI world closed its doors to them. Backlog fell over 4% between October and November as Greece completes 88% of 2023 applications and half of 2024’s submissions. “The demand is unstoppable, it just grows,” says Volek. “But on the supply side there’s a definite tightening.” U-Haul data shows California and New York hemorrhaging residents to low-tax Texas and Florida. Attorney Mona Shah: “The exodus is real and significant.” Live in Panama, earn in Europe, pay zero tax. These 29 countries only tax local income. Your complete territorial tax guide."
          ],
          "published_date": "11/14/2025, 08:00 AM, +0000 UTC",
          "source": {
            "name": "IMI Daily",
            "icon": "https://encrypted-tbn2.gstatic.com/faviconV2?url=https://www.imidaily.com&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL"
          },
          "thumbnail": "https://www.imidaily.com/wp-content/uploads/2025/11/imidaily-armenia-fast-track-invstor-300x167.webp",
          "_timestamp": 1763107200000
        },
        {
          "country": "New Zealand",
          "title": "New Zealand | Student visa work rights expanded; Guardian Visitor Visa applications move online",
          "url": "https://www.bal.com/immigration-news/new-zealand-student-visa-work-rights-expanded-guardian-visitor-visa-applications-move-online/",
          "snippet": "",
          "full_content": [
            "Effective Nov. 3, 2025, New Zealand Immigration will implement two key changes impacting international student visa work rights and Guardian Visitor Visas. Eligible student visa holders will be permitted to work up to 25 hours per week during the academic term, up from the current 20-hour limit. This change applies to: Students with existing visas must apply for a “variation of conditions” status to access the increased work hours. All applications for Guardian Visitor Visas must be submitted via the enhanced Immigration Online system starting Nov. 3. The new platform offers:",
            "Additional Information: These updates reflect New Zealand’s ongoing efforts to support international education and improve visa processing efficiency. This alert has been provided by the BAL Global Practice Group. Copyright © 2025 Berry Appleman & Leiden LLP. All rights reserved. Reprinting or digital redistribution to the public is permitted only with the express written permission of Berry Appleman & Leiden LLP. For inquiries, please contact copyright@bal.com. On Jan. 1, 2026, U.S. Citizenship and Immigration Services issued a new “hold and review” policy memorandum (PM-602-0194), effective…",
            "U.S. Citizenship and Immigration Services has implemented updated filing fees for certain immigration benefit requests, effective Jan. 1,… U.S. Customs and Border Protection (CBP) has issued an update to its Carrier Liaison Program (CLP), revising the list of… The proclamation issued on Dec. 16, 2025, expands and revises entry restrictions that impact nationals from 39 countries, effective as… ©2026 Berry Appleman & Leiden. All Rights Reserved.\n      Susan Wehrer, General Counsel."
          ],
          "published_date": "10/28/2025, 07:00 AM, +0000 UTC",
          "source": {
            "name": "BAL Immigration Law",
            "icon": "https://encrypted-tbn2.gstatic.com/faviconV2?url=https://www.bal.com&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL"
          },
          "thumbnail": "https://www.bal.com/wp-content/uploads/2019/09/COUNTRY-TEMPLATE-TW-53-1024x576.png",
          "_timestamp": 1761634800000
        },
        {
          "country": "Iraq",
          "title": "Kurdistan, Germany seal MoU to curb irregular migration - Shafaq News",
          "url": "https://shafaq.com/en/Kurdistan/Kurdistan-Germany-seal-MoU-to-curb-irregular-migration",
          "snippet": "",
          "full_content": [
            "Iranian FM in Beirut as Lebanon steps up disarmament plan PM Barzani warns Aleppo violence risks demographic change 8+ civilians killed in Aleppo as Damascus, SDF trade blame Lebanese Army takes operational control south of the Litani River The Kurdistan Region’s Joint Crisis Coordination\nCenter (JCC) and the Deutsche Gesellschaft für Internationale Zusammenarbeit\n(GIZ), a German development agency, signed a memorandum of understanding (MoU) Thursday\nin Erbil to strengthen migration management.",
            "Backed by the Kurdistan Interior Ministry and the\nGerman Consulate, the agreement focuses on expanding access to legal migration\npathways—including visas, education, and employment—to reduce dependence on\nhuman smuggling networks. In a joint press conference alongside German Consul\nGeneral Albrecht von Wittke on the sidelines of the MoU's signing, Kurdish Interior Minister Reber Ahmed welcomed Germany’s broader support for Iraq and\nKurdistan, highlighting Berlin’s contributions in counterterrorism and\nhumanitarian aid, and praised the partnership for helping guide youth toward\nstructured migration through awareness campaigns on legal procedures, job\naccess, and language skills. Von Wittke, for his part, referenced Germany’s longstanding migration\nhistory with Kurds—dating back to the 1980s and reinforced during the 2014 ISIS\ncrisis—emphasizing the MoU’s role in channeling movement through legal routes\nand facilitating voluntary returns. The agreement follows recent warnings from German\nofficials about the dangers of irregular migration, including a consular\nvisit to Zakho, where he urged youth not to trust smugglers offering illegal\naccess to Europe. Migration from the Kurdistan Region has surged\nover the past decade, with the Association of Returnee Refugees estimating that\nmore than 150,000 Kurds left for Europe between 2014 and 2024, often via\nhazardous routes through Belarus and the Balkans, where many faced exploitation\nor death.",
            "In response, Germany and the Kurdistan Regional\nGovernment (KRG) have expanded cooperation on reintegration\nprograms, while Berlin reaffirmed its commitment to working with both Erbil and\nBaghdad on refugee protection, youth employment, and long-term migration\nstrategies. Read\nmore: German Ambassador to Iraq: Security, refugees, economy, and women’s\nrights Terms & Conditions\n                \n                Privacy Policy"
          ],
          "published_date": "10/16/2025, 07:00 AM, +0000 UTC",
          "source": {
            "name": "شفق نيوز",
            "icon": "https://encrypted-tbn1.gstatic.com/faviconV2?url=https://shafaq.com&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL"
          },
          "thumbnail": "https://media.shafaq.com/media/arcella/1760610231311.webp",
          "_timestamp": 1760598000000
        },
        {
          "country": "Iraq",
          "title": "Iraqi asylum seeker slated for removal to Nauru loses High Court challenge",
          "url": "https://www.abc.net.au/news/2025-09-03/iraqi-asylum-seeker-wins-loses-high-court-challenge-visa/105728490",
          "snippet": "",
          "full_content": [
            "Find any issues using dark mode? Please let us know The man went to the High Court to challenge a decision to send him to Nauru after he was released from jail. (ABC News: Matt Roberts) An Iraqi man went to the High Court to challenge his deportation to Nauru, after his temporary protection visa was cancelled. He was one of three men set to be removed to the island nation, who had last year been released from indefinite immigration detention. The man had thought that meant he was free, but a ruling later stated he would be sent to Nauru, and the High Court today upheld that decision. An Iraqi man slated for removal to Nauru has lost his High Court appeal challenging the legality of the way his temporary protection visa was cancelled. The man is one of three people who were slated to be removed to Nauru in February under the government's newly minted agreement with the tiny island nation, which was stepped up at the weekend with a $408 million deal. The three men were on special bridging visas because they were part of a group released from indefinite immigration detention after the NZYQ decision in the High Court. In that decision, the court found indefinite immigration detention was illegal in circumstances where there was no prospect of deportation in the foreseeable future. Hundreds of detainees were released into the community, many of whom were convicted of violent offences, although they had served their time in jail. To deal with the issue, the parliament passed a law allowing people who could not be returned to where they came from to be sent to a third country, with Nauru the first to agree. The 65-year-old Iraqi man arrived in Australia in 2012. He was on a temporary protection visa and found to be owed protection by Australia. But in 2022, he was convicted of a crime and sentenced to jail for five years and nine months for \"aggravated detaining of a person for advantage\". The confusion began when the man was released on parole in 2024, into immigration detention. Lawyers for the man say he does not speak, read or write in English.",
            "Today's case began dramatically with an urgent application to the High Court on a weekend. In the end, the government agreed not to deport any of the three until their legal challenges were resolved. Today's case did not directly challenge the new law but was aimed at the legality of a decision to revoke the man's original protection visa. But win or lose, today's outcome was never going to end the man's fight to stay in Australia The application was made to the High Court over the weekend. (ABC News: Matt Roberts) That is because he and the other two men have been fighting separate battles in the Federal Court that are directed at the moves to remove them to Nauru, claiming a lack of procedural fairness. In the face of this, the government has introduced a bill to the parliament that would remove the obligation to grant procedural fairness to non-citizens facing removal to a third country. Details of the case emerged in a Federal Court ruling on another man in the group when it was revealed that part of the complaint is that the government obtained \"long-term stay visas\" for the men to go to Nauru, filling in the forms in their stead, and not telling them until later. On the same day the man was released on parole last year, he was told his application to regain his visa was rejected, and he had seven days to respond. He was then taken to another meeting, where he was released into the community on the bridging visa set up after the NZYQ ruling. The man's lawyers say he thought he was free at last. Australia will pay a further $70 million per year to cover the ongoing resettlement costs for the group of more than 350 people. The man did not realise something was wrong until he was taken back into custody in February and told he would be going to Nauru. His lawyers told the High Court the decision about the man's visa status was based on a misunderstanding of the law. The High Court heard the man was assessed against criteria in the character test, which did not apply to him. \"It is not in dispute that none of those applied to my client,\" Mr Lenehan said.",
            "But today the High Court found none of those grounds had been established and threw out the case. Laura John of the Human Rights Law Centre, which represented the man, expressed disappointment over the High Court's decision. \"Our client has lived through untold horrors in the Iraq wars,\" she said. \"In Australia, he has faced homelessness and destitution, and indefinite separation from his wife and children. He is now in his 60s and has health conditions that threaten his life. \"Yet this is who the Albanese government believes must be relentlessly pursued into lifelong exile in Nauru.\" Ms John has called on the government to change its policies. \"It wants to set a new baseline for how we treat migrants and refugees in this country. But our rights should be the same, regardless of visa status.\" Whether the three men were denied procedural fairness or not will be the next battleground in the High Court. That case involves an Iranian man who arrived in Australia in 1990. In 1999, he was sentenced to a lengthy period in jail after murdering his wife. He lost his initial case in the Federal Court, but the government has applied to remove the case to the High Court, sidestepping a Federal Court appeal. So far, there is no date for the case to be considered. Your home of Australian stories, conversations and events that shape our nation. This service may include material from Agence France-Presse (AFP), APTN, Reuters, AAP, CNN and the BBC World Service which is copyright and cannot be reproduced. We acknowledge Aboriginal and Torres Strait Islander peoples as the First Australians and Traditional Custodians of the lands where we live, learn, and work. Sign up to get the latest on your favourite topics from the ABC"
          ],
          "published_date": "09/03/2025, 07:00 AM, +0000 UTC",
          "source": {
            "name": "Australian Broadcasting Corporation",
            "icon": "https://encrypted-tbn1.gstatic.com/faviconV2?url=https://www.abc.net.au&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL",
            "authors": ["Elizabeth Byrne"]
          },
          "thumbnail": "https://live-production.wcms.abc-cdn.net.au/c03abbb8e0dcab5f6246dd5654741544?impolicy=wcms_crop_resize&cropH=2250&cropW=4000&xPos=0&yPos=209&width=862&height=485",
          "_timestamp": 1756882800000
        },
        {
          "country": "Bhutan",
          "title": "Foreign ministry advises illegal Bhutanese immigrants in US to return",
          "url": "https://asianews.network/foreign-ministry-advises-illegal-bhutanese-immigrants-in-us-to-return/",
          "snippet": "",
          "full_content": [
            "The directive comes amid reports of a leaked memo signed by US Secretary of State Marco Rubio, outlining a 60-day deadline for flagged countries to address key concerns or face entry bans for their citizens. Federal agents patrol the halls of immigration court at the Jacob K. Javitz Federal Building on June 9, 2025 in New York City. PHOTO: AFP THIMPHU – In a notification issued yesterday, the Ministry of Foreign Affairs and External Trade (MoFAET) urged undocumented Bhutanese nationals in the United States (US) to voluntarily return home following revelations that the US government may impose travel restrictions on Bhutan and 35 other countries over immigration and national security concerns. The public notification advises Bhutanese nationals without lawful immigration status to comply fully with US immigration laws or face potential consequences, including deportation. This directive comes amid reports of a leaked memo signed by US Secretary of State Marco Rubio, outlining a 60-day deadline for flagged countries to address key concerns or face entry bans for their citizens. According to the memo, Bhutan has been flagged due to weak passport and document security, high rates of visa overstays, limited co-operation with US deportation procedures, and concerns related to terrorism, antisemitism, or anti-American rhetoric. Currently, around 1,500 Bhutanese are reportedly living in the US, registered with the Bhutanese Embassy in the US. However, estimates suggest much higher numbers, between 4,000 and 5,000, as of 2025, with population concentrated in areas like New York, Ohio, and Pennsylvania. The Yearbook of Immigration Statistics 2023 maintained by the Office of Homeland Security Statistics records 24,770 individuals with the status of refugees from Bhutan. Of the total immigrants between 2014 and 2023, a total of 1,190 had obtained a lawful permanent resident status. According to the past records between 1986 and 1996, the total number of immigrants from Bhutan in the US was just 22 individuals. US Embassy spokesperson told Kuensel that the foreign nationals in the US residing illegally should leave immediately. “The Department of Homeland Security has announced a historic opportunity for illegal aliens to receive cost-free travel, forgiveness of any failure to depart fines, and a USD 1,000 exit bonus to facilitate travel back to their home country or another country where they have lawful status through the CBP Home Mobile App.”",
            "“Depending on their circumstances, they might receive financial and other assistance from the US government to depart,” said the spokesperson. “Individuals who wish to take advantage of this offer must register through the CBP Home App: www.dhs.gov/cbphome.” Minister for Foreign Affairs and External Trade DN Dhungyel said that the government has initiated high-level discussions with US counterparts to ensure that the issue is solved at the earliest. “We are working through appropriate channels to resolve this issue in a timely manner,” the minister said. The ministry’s public notification also informed Bhutanese nationals that those opting for “voluntary departure” may be eligible for financial assistance from US agencies to cover return travel to Bhutan. Additionally, the notification states that the enforcement of US immigration laws and regulations is the sovereign prerogative of the US government and all Bhutanese must fully comply with directives issued by US immigration authorities at all times. The MoFAET also stated that relevant notifications issued by the US government in the past have been disseminated via mainstream national media and social media to enable all Bhutanese who do not have lawful immigration status to take an informed decision. “The government will not be in a position to intervene or provide consular support in cases of non-compliance with US immigration laws and regulations,” the notification stated. Bhutan is among 36 countries flagged in the US State Department’s memo, which includes a broad list spanning Africa, Central Asia, the Caribbean, and the Pacific. This latest move by the US is a part of a broader immigration crackdown, which aims to tighten border controls and address national security threats related to identity verification and passport integrity. This follows an earlier proclamation on June 4, which already imposed full bans on 12 countries and partial restrictions on seven others. Countries on the list, including Bhutan, have 60 days from mid-June to present a detailed action plan to the US. If the administration is not satisfied with their progress or commitment, President Trump could approve bans affecting tourists, students, or even broader categories of travelers.",
            "International media reports stated that the administration has already taken steps against foreign students, including deportation. Several policies have targeted student visa holders, including efforts to limit enrollment or initiate deportation proceedings. Legal immigrants from affected nations may also face delays or denials when applying for visas, green cards, or citizenship, especially if their home countries fail to meet updated US vetting requirements. Experts say that if the US imposes a travel ban on Bhutan, the consequences could be far-reaching, affecting not only individuals but also the country’s diplomatic relations, economy, and reputation on the global stage. Bhutanese nationals seeking to study, work, or travel to the US would face major obstacles,  particularly bureaucratic delays or outright visa denials.  The ban could also affect Bhutanese citizens applying for tourist or business visas, restricting opportunities for travel, knowledge exchange, and professional development. The travel ban could also result in a drop of remittance inflows, which are vital to many Bhutanese households. The US is Bhutan’s second-largest source of remittances, with USD 6.6 million sent as of April 2024, according to the Royal Monetary Authority’s quarterly report. A decline in this income would strain livelihoods and increase economic pressure on families who depend on remittances. The inclusion in the US immigration blacklist will also tarnish Bhutan’s international image and may lead to heightened scrutiny from other nations, foreign policy experts said. The travel ban, tourism stakeholders fear, could reduce tourist inflow from the US. The travel ban or diplomatic freeze could also create uncertainty for potential investors, leading American investors to view Bhutan as a higher-risk destination, even if the country’s fundamentals remain stable. Some fear that with projects like Gelephu Mindfulness City aiming to attract global investments, a perception of non-co-operation could discourage potential American partners and affect the inflow of capital."
          ],
          "published_date": "06/23/2025, 07:00 AM, +0000 UTC",
          "source": {
            "name": "Asia News Network",
            "icon": "https://encrypted-tbn1.gstatic.com/faviconV2?url=https://asianews.network&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL"
          },
          "thumbnail": "https://asianews.network/wp-content/uploads/bfi_thumb/AFP__20250614__62C42ZU__v1__MidRes__IceDetainsImmigrantsInsideNewYorkCityCourthouses-7k55e4fqjohw649qbafsn59ft3llp3vqib7mehydf0g.jpg",
          "_timestamp": 1750662000000
        },
        {
          "country": "Israel",
          "title": "Israel | Stay visas automatically extended",
          "url": "https://www.bal.com/immigration-news/israel-stay-visas-automatically-extended/",
          "snippet": "",
          "full_content": [
            "In response to the ongoing security situation in Israel, the Population and Immigration Authority announced that visas for foreign nationals staying legally in Israel, that were valid as of June 12, 2025, are automatically extended until Sept. 30, 2025. This alert has been provided by the BAL Global Practice Group. Copyright © 2025 Berry Appleman & Leiden LLP. All rights reserved. Reprinting or digital redistribution to the public is permitted only with the express written permission of Berry Appleman & Leiden LLP. For inquiries, please contact copyright@bal.com.",
            "On Jan. 1, 2026, U.S. Citizenship and Immigration Services issued a new “hold and review” policy memorandum (PM-602-0194), effective… U.S. Citizenship and Immigration Services has implemented updated filing fees for certain immigration benefit requests, effective Jan. 1,… U.S. Customs and Border Protection (CBP) has issued an update to its Carrier Liaison Program (CLP), revising the list of…",
            "The proclamation issued on Dec. 16, 2025, expands and revises entry restrictions that impact nationals from 39 countries, effective as… ©2026 Berry Appleman & Leiden. All Rights Reserved.\n      Susan Wehrer, General Counsel."
          ],
          "published_date": "06/17/2025, 07:00 AM, +0000 UTC",
          "source": {
            "name": "BAL Immigration Law",
            "icon": "https://encrypted-tbn2.gstatic.com/faviconV2?url=https://www.bal.com&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL"
          },
          "thumbnail": "https://www.bal.com/wp-content/uploads/BALCountryOverview_Israel-1340x409.webp",
          "_timestamp": 1750143600000
        },
        {
          "country": "Germany",
          "title": "Germany Clamps Down on Migration, Citizenship",
          "url": "https://etias.com/articles/germany-clamps-down-on-migration,-citizenship",
          "snippet": "",
          "full_content": [
            "As Germany moves to curb irregular migration, the government is introducing sweeping changes that restrict family reunification and dismantle fast-track citizenship pathways for foreign workers. These measures mark a sharp policy shift that critics warn could undermine both humanitarian commitments and efforts to address labor shortages. Only weeks after taking office, the new German government approved a plan to suspend family reunification for a large group of migrants and scrap fast-track citizenship. The suspension affects people under subsidiary protection, those who don’t qualify as full refugees but cannot return home due to danger. For the next two years, their family members won’t be allowed to join them in Germany. Interior Minister Alexander Dobrindt described the plan as a “decisive day” in cutting irregular migration and easing the pressure on local governments handling integration. Critics, however, warned that the change could fracture families and ignore humanitarian obligations. The cabinet also moved to abolish the fast-track citizenship path, which had allowed highly integrated migrants to apply after just three years. That rule, passed under former Chancellor Olaf Scholz, aimed to draw skilled workers and reward those who proved fluency, employment, and education. “It was a mistake,” Dobrindt said. “German citizenship must come at the end of an integration process, not the beginning.” Under the new rules, the minimum residency to apply for naturalization will return to five years. Merz’s administration hopes the change will curb what they call “pull factors” attracting migrants to Germany. The proposal is expected to pass through Parliament before the summer recess in July. Urgent cases, such as medical emergencies, may be exempted from the family reunification freeze. Still, the message is clear: Germany’s doors are not as open as before. The decision aligns with a wider political trend. The far-right Alternative for Germany (AfD) party secured over 20% in the February election, pushing mainstream politicians to harden their stance on migration.",
            "Critics accused Merz of echoing the AfD’s rhetoric, but he argued that decisive action is the only way to contain its rise. Herbert Bruecker, a respected migration scholar, questioned whether the suspension of family reunification would have a real effect on migration. He said the impact would likely be “very low” and might even hurt Germany’s workforce by pushing away skilled applicants. “This affects the exact group we want in Germany—people who are highly qualified and have a high income,” Bruecker noted. He warned that undoing citizenship incentives could slow the country’s effort to fill job gaps. Despite tightening rules, naturalization in Germany hit a record high in 2024. Nearly 250,000 migrants became German citizens, breaking the previous record set just a year earlier. Most were Syrian and Turkish nationals, with Russians making up a growing share. Helmut Dedy, head of the German Association of Cities, attributed the surge to reforms by the former coalition government, which lowered the wait time from eight to five years. “Many people who arrived during the refugee crisis of 2015 and 2016 are now applying,” Dedy explained. Still, fast-track or “turbo” citizenships remain rare. In most places, only a few hundred people qualified under the three-year rule in 2024. Critics said that Merz is making a symbolic move that has little real-world effect. Germany’s suspension of family reunifications for holders of subsidiary protection and the rollback of fast-track citizenship pathways complicate mobility across Europe. Long-term migrants face disrupted family plans, while high-skilled applicants lose incentives for early integration.",
            "The timing is key: with the European Travel Information and Authorization System (ETIAS) set to launch in the last quarter of 2026 and Schengen visa scrutiny increasing, the EU’s message to both tourists and potential migrants is clear—entry may be easier, but settlement is becoming harder. (Image courtesy of Pradeep Thomas Thundiyil via iStock) Germany’s shift marks a broader realignment of EU immigration policies. The Merz government’s emphasis on “reducing pull factors” and restoring stricter naturalization timelines signals a return to securitized migration control. As other EU nations monitor the domestic backlash and rising far-right pressure, Germany’s approach may become a blueprint—or a warning—amid rising political polarization over immigration. As Germany rolls back fast-track citizenship and suspends family reunification for many migrants, critics warn of a humanitarian cost and a shrinking welcome mat for skilled newcomers. While the government frames these reforms as necessary deterrents, the symbolic shift away from integration-first policies may redefine Europe’s migration landscape. What unfolds next will test not only Germany’s policies but its identity. We make the ETIAS application process simple and easy by providing the latest news and analysis about the European Travel Information and Authorisation System (ETIAS). All rights reserved. Reproduction of any content, images or other representation of this site is prohibited and copyright violators will be pursued legally to the full extent of the law. This site uses cookies only for analytics purposes. Opt-out on the cookie policy page. Or agree and continue"
          ],
          "published_date": "06/06/2025, 07:00 AM, +0000 UTC",
          "source": {
            "name": "ETIAS.com",
            "icon": "https://encrypted-tbn3.gstatic.com/faviconV2?url=https://etias.com&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL"
          },
          "thumbnail": "https://etias.com/assets/uploads/imagery/blog/podium-with-microphones-in-front-of-german-flag.jpg",
          "_timestamp": 1749193200000
        },
        {
          "country": "UK",
          "title": "UK Government Publishes Immigration White Paper Setting Out Significant Intended Reforms",
          "url": "https://www.morganlewis.com/pubs/2025/05/uk-government-publishes-immigration-white-paper-setting-out-significant-intended-reforms",
          "snippet": "",
          "full_content": [
            "The UK government published its immigration White Paper on May 12 setting out proposed reforms to the UK’s immigration system. Titled Restoring Control over the Immigration System, the government outlines its intention to “restore confidence” following “a significant increase in overall levels of migration” and a shift “away from higher-skilled migration and towards lower-skilled migration.” As outlined in this LawFlash, policy initiatives to reverse this trend are likely to have a significant impact on employers recruiting overseas workers. As the UK’s principal work route, the Skilled Worker visa has provided flexibility to employers in recruiting overseas workers. Despite having historically required workers to be sponsored to perform a degree-level role (i.e., a role meeting RQF 6 or above), the skills threshold for eligible occupations was lowered in 2020 to allow A-Level–equivalent RQF 3 occupations to be eligible for sponsorship. Since this change, the proportion of Skilled Worker visas issued to those sponsored in roles below RQF 6 has risen from 10% to 60%. The government therefore intends to remove all occupations with a skill level below RQF 6 from eligibility for sponsorship under the Skilled Worker route. This change will impact approximately 180 occupations that will no longer be eligible for sponsorship, including care workers, who will be subject to a ban on overseas recruitment. However, a transition period will be introduced for care workers, during which in-country switches and extensions will be permitted until 2028, subject to further review. Employers will then only be able to sponsor workers where the role is at least graduate level unless they are able to utilise one of the confirmed exceptions: Minimum salary requirements for Skilled Worker visas will rise in line with the increased skill level as will the English language requirement for main applicants, increasing from the current B1 to B2 (independent user) on the Common European Framework of Reference for Languages. In addition to raising the skills threshold for the Skilled Worker route, the government also plans to expand and promote a number of visa routes targeted at the “very highly skilled.” It is planned that the High Potential Individual route (which is for individuals who have graduated from a leading university outside of the UK) will be expanded such that the number of qualifying universities is doubled. This will considerably increase employers’ ability to bring graduates into the UK and may be used to fill graduate vacancies where starting salaries do not meet the Skilled Worker visa threshold, with an expectation that individuals may switch into the Skilled Worker route later in their career. High Potential Individual visas are currently issued for a set period of two years in line with the UK’s Graduate visa route. However, to prevent abuse of the Graduate visa route, the visa period for graduates from UK universities will be reduced to 18 months. Employers hiring recent graduates using the Graduate visa route are still expected to benefit from a reduced salary requirement when switching these workers into the Skilled Worker route as “new entrants” to the labour market.",
            "To promote entrepreneurship, the government will undertake a review of the Innovator Founder visa, aiming to assist those studying at UK universities to build their businesses and careers in the UK. For more established overseas businesses wishing to expand into the UK, the Expansion Worker visa route will be reformed to allow up to 10 staff members (increased from five) to come to the UK to establish the new business. The UK operates a system allowing employers to sponsor workers coming to the UK and has long maintained the position that sponsorship is a privilege that brings with it a myriad of duties. Historically, these duties have focused on recordkeeping and the prevention of illegal working. In this White Paper, the government wishes to expand the sponsorship regime to include a direct link to domestic skills training. Going forward, employers are expected to contribute to the development of skills training in the UK. To this end, the government will establish the Labour Market Evidence Group to gather and share evidence about the state of the workforce, training levels, and participation in the domestic labour market. The group will focus on sectors central to the government’s Industrial Strategy and those which are heavily reliant on migrant workers. It will then make recommendations as to whether workforce strategies are required to improve domestic training and participation, and employers in these sectors will be expected to comply with such plans. Further, where a sector or occupation is identified as having a long-term labour shortage and a workforce strategy is already in place, and employers are contributing to domestic training, the occupation may be placed on the new Temporary Shortage List. Replacing the Immigration Salary List (which will be abolished), this new list will allow below-degree-level roles to be sponsored under the Skilled Worker route on a time-limited basis. This is expected to benefit occupations linked to industrial strategy or critical infrastructure, including many roles in the construction sector. However, individuals sponsored in these roles will not be permitted to bring family members. In addition, the government is considering whether certain RQF 6+ roles should be subject to workforce plans, where evidence suggests an overreliance on migrant labour. Employers will also be expected to contribute more financially to skills training via a 32% increase to the Immigration Skills Surcharge, a fee payable when assigning certificates of sponsorship. The fee, currently £1,000 per year for large sponsors and £364 per year for small or charitable sponsors, will rise to £1,320 and £480 per year, respectively. Under current rules, individuals are generally eligible to apply for indefinite leave to remain (also referred to as “settlement” or “permanent residence”) after living in the UK for five years under the Skilled Worker or another eligible route.",
            "To ensure that only those who have significantly contributed to the UK’s economy and society gain the right to settle and, in due course, obtain British citizenship, the government plans to double the qualifying residence period from five to 10 years. The principles underpinning the Points-Based System will be extended to both settlement and citizenship applications, meaning individuals must “earn” their right to be granted these statuses. To qualify for settlement and citizenship, individuals must already demonstrate an English language proficiency and pass the Life in the UK test. Both will be reformed: As part of its overarching objective to “restore control” over immigration, the government has placed renewed emphasis on enforcement. Employers must continue to carry out compliant right to work checks and ensure they are meeting their sponsorship obligations. The government intends to introduce “innovative financial measures, penalties or sanctions” to encourage compliance, and has highlighted reforms under the Border Security, Asylum and Immigration Bill, currently progressing through Parliament. The Bill includes provisions to expand the illegal working regime to cover businesses engaging self-employed gig economy workers and subcontractors, potentially exposing employers to civil penalty fines of up to £60,000 per worker (see our April 2025 LawFlash). Employers should monitor updates closely, ensure proper staff training is in place, and seek legal advice to respond to any Home Office enquiries or compliance visits. While the White Paper sets out the government’s policy intentions, changes will require amendments to legislation and the Immigration Rules before implementation. Employers should consider performing the following actions in the interim: If you have any questions or would like more information on the issues discussed in this LawFlash, please contact any of the following:"
          ],
          "published_date": "05/13/2025, 07:00 AM, +0000 UTC",
          "source": {
            "name": "Morgan Lewis",
            "icon": "https://encrypted-tbn3.gstatic.com/faviconV2?url=https://www.morganlewis.com&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL"
          },
          "thumbnail": "https://www.morganlewis.com/-/media/images/tiles/labor/173112_shiftinglandscapes_mdwebtile_173594146.jpg?rev=f9e29b1f90404c3a96103e71be79dbf7&hash=B828DD0789C3D86B9DFC89855E44F9B2",
          "_timestamp": 1747119600000
        },
        {
          "country": "Indonesia",
          "title": "Indonesian student detained by Ice after US secretly revokes his visa",
          "url": "https://www.theguardian.com/us-news/2025/apr/19/aditya-wahyu-harsono-immigration-indonesia",
          "snippet": "",
          "full_content": [
            "Aditya Wahyu Harsono, father of infant with special needs, surprised at work despite valid visa through June 2026 An Indonesian father of an infant with special needs, who was detained by federal agents at his hospital workplace in Minnesota after his student visa was secretly revoked, will remain in custody after an immigration judge ruled on Thursday that his case can proceed. Judge Sarah Mazzie denied a motion to dismiss the case against Aditya Wahyu Harsono on humanitarian grounds, according to his attorney. Harsono, 33, was arrested four days after his visa was revoked without notice. He is scheduled for another hearing on 1 May. “His wife has been in a state of shock and exhaustion,” Sarah Gad, Harsono’s lawyer, said. “The Department of Homeland Security has weaponized the immigration system to serve just an entirely different purpose, which is to instill fear.” Harsono, a supply chain manager at a hospital in Marshall, Minnesota, who is married to a US citizen, was surprised by authorities in his workplace basement on 27 March. Gad said that Harsono was detained without clear explanation and interrogated for hours. Harsono’s wife, Peyton, called Gad in a panic after she received a call from human resources at the hospital. Two Immigration and Customs Enforcement (Ice) agents, dressed in plain clothes, had shown up and instructed the staff to stage a fake meeting in the basement so they could apprehend him, according to Gad. Hospital staff were distraught but felt forced to comply. “He unsuspectedly walks in, smiling, and then they just pull out their handcuffs and forcibly detain him, pushing against the wall, start frisking him, and stripping all of his belongings,” Gad said.",
            "The Department of Homeland Security and the Department of State did not immediately respond to requests for comment from the Guardian. Harsono was brought to the Kandiyohi county jail, where he is still detained, according to the Ice detainee locator. He told the Ice agents that his F-1 student visa was valid through June 2026, and that he had a pending green-card application based on his marriage to a citizen, but that he had been issued a notice to appear in court stating that he had overstayed his visa. His attorney said that as of 28 March, the day after his arrest, his F-1 visa was still active. Gad said the government revoked it without any notice to him, and then claimed he had overstayed. The revocation was backdated to 23 March and allegedly based on his 2022 misdemeanor conviction for graffitiing a semi-truck trailer. Gad said that this is not a deportable offense under the Immigration and Nationality Act. He had traveled internationally and returned multiple times to Indonesia since the conviction without incident. The day before Harsono’s bond hearing, DHS disclosed their evidence against him. Besides stating that his visa had been revoked for the misdemeanor graffiti conviction, for which he paid $100 in restitution, they also mentioned an arrest from 2021 during a protest over the murder of George Floyd. That charge was dismissed. Harsono is Muslim and frequently posts on social media in support of humanitarian relief for Gaza. He also runs a small non-profit, which sells art and merchandise, with proceeds going to organizations aiding Gaza. His wife and eight-month-old daughter, who has special needs, are distraught by his arrest, Gad said. After the judge granted Harsono a $5,000 bond on 10 April, the Minnesota Freedom Fund had been en route to pay it. But DHS immediately filed a notice to appeal the bond decision, which triggered an automatic stay, meaning Harsono had to remain in custody. Gad said this type of move is rare, usually only seen when a judge grants bond to someone charged with violent or serious crimes.",
            "“You never involve stays of an immigration judge’s bond order for a minor conviction when somebody’s on their way to becoming a green-card holder,” she said. Gad is preparing to file a federal petition and a temporary restraining order against DHS. In an appeal for help on GoFundMe, Harsono’s wife explained that her husband had been fired from his job while in detention and now the family is “in danger of losing our apartment” and they “no longer have health insurance”. The Minnesota Nurses Association condemned the hospital worker’s arrest and restated its position that “nurses should not and will not serve any role in immigration enforcement” and its hope that “all hospital employees will also reject a role in assisting Ice”. Harsono’s case comes amid a wave of reports of student visas being revoked under the Trump administration’s new executive policy. The actions by the federal government to terminate students’ legal status have left hundreds of scholars at risk of detention and deportation. At least 901 students at 128 colleges and universities have had their visas revoked or their legal statuses terminated since mid-March, according to an Associated Press review of university statements and correspondence with school officials. In some high-profile cases, including the detention of the former Columbia University graduate student Mahmoud Khalil, the Trump administration has argued it should be allowed to deport noncitizens over involvement in pro-Palestinian activism it casts as antisemitic. But in the vast majority of visa revocations, colleges say there is no indication that affected students had a role in protests."
          ],
          "published_date": "04/19/2025, 07:00 AM, +0000 UTC",
          "source": {
            "name": "The Guardian",
            "icon": "https://encrypted-tbn0.gstatic.com/faviconV2?url=https://www.theguardian.com&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL",
            "authors": ["Coral Murphy Marcos"]
          },
          "thumbnail": "https://i.guim.co.uk/img/media/3a43d1eaa2e95650e34757d82253187c664e2a41/217_850_2715_1629/master/2715.jpg?width=465&dpr=1&s=none&crop=none",
          "_timestamp": 1745046000000
        },
        {
          "country": "Indonesia",
          "title": "Indonesian Embassy urges students in US to be cautious amid visa concerns",
          "url": "https://www.thejakartapost.com/world/2025/04/14/indonesian-embassy-urges-students-in-us-to-be-cautious-amid-visa-concerns.html",
          "snippet": "",
          "full_content": [
            "Your browser is out of date, and may not be compatible with our website. A list of the most popular web browsers can be found below.\n                    Just click on the icons to get to the download page. International students' visas can be revoked for law violations, both local and federal, as well as any hint of criticism against the Zionist regime in Israel. he Indonesian Embassy in Washington, DC urged Indonesian students to stay cautious amid concerns over possible cancellations of the United States visa for international students. Recent reports suggest that more than 525 students, lecturers and researchers from over 80 universities across the US have had their visas revoked this year. This number is higher than the figure from US State Secretary Marco Rubio in March, who said that his department had canceled over 300 visas, most of them student visas.",
            "“In light of increased monitoring and enforcement of regulations on international student visas by US immigration, all Indonesian students holding F-1 and/or J-1 visas are advised to exercise greater caution,” the Indonesian Embassy stated on its official Instagram account, @IndonesianDC. The F-1 visa is a non-immigrant visa granted to international students pursuing academic studies in the US while the J-1 visa is a non-immigrant visa that allows foreign nationals to come to the US to study, teach, conduct research or participate in work-based programs. Under previous regulations, students whose visas were revoked could still continue their studies, as their legal stay was not immediately affected. It mainly limited international travel, and students could reapply through the State Department. However, under the new policy, revoking a visa can now impact their legal status entirely, requiring them to leave the US immediately or risk detention by immigration authorities. Share your experiences, suggestions, and any issues you've encountered on The Jakarta Post. We're here to listen.",
            "Thank you for sharing your  thoughts. We appreciate your feedback. Quickly share this news with your network—keep everyone informed with just a single click! Customize your reading experience by adjusting the text size to small, medium, or large—find what’s most comfortable for you. Share the best of The Jakarta Post with friends, family, or colleagues. As a subscriber, you can gift 3 to 5 articles each month that anyone can read—no subscription needed! Get the best experience—faster access, exclusive features, and a seamless way to stay updated."
          ],
          "published_date": "04/14/2025, 07:00 AM, +0000 UTC",
          "source": {
            "name": "The Jakarta Post",
            "icon": "https://encrypted-tbn3.gstatic.com/faviconV2?url=https://www.thejakartapost.com&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL"
          },
          "thumbnail": "https://img.jakpost.net/c/2025/04/14/2025_04_14_161882_1744616307._large.jpg",
          "_timestamp": 1744614000000
        }
      ]
      // console.log(allNews)

      return {
        status: true,
        data: allNews
        // total: allNews.length,
        // page,
        // pageSize,
        // totalPages: Math.ceil(allNews.length / pageSize),
        // data: paginatedData.map(({ _timestamp, ...rest }) => rest),
      };
    } catch (error) {
      console.error("Service Error:", error.message);
      return { status: false, message: "Failed to fetch visa news" };
    }
  }


}


export default new NewsService();
