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


  // async fetchVisaNewsWithFullContent(country) {
  //   const query = country
  //     ? `latest visa and immigration news in ${country}`
  //     : `latest visa and immigration news around the world`;

  //   try {
  //     const response = await axios.post("https://api.tavily.com/search", {
  //       api_key: process.env.TAVILY_API_KEY,
  //       query,
  //       max_results: 20, // fetch extra to filter
  //       include_answer: true,
  //       include_raw_content: true,
  //       include_images: false,
  //     });

  //     const results = response.data.results || [];

  //     // Visa/immigration keywords
  //     const visaKeywords = [
  //       "visa",
  //       "immigration",
  //       "migrant",
  //       "migration",
  //       "citizenship",
  //       "h-1b",
  //       "student visa",
  //       "residency",
  //       "green card",
  //       "passport",
  //       "travel ban",
  //       "work permit",
  //       "asylum",
  //       "refugee",
  //     ];

  //     // Helper to clean raw HTML/text
  //     const cleanText = (raw) => {
  //       if (!raw) return "Content not available.";
  //       const text = raw.replace(/<[^>]*>/g, " "); // Remove HTML tags
  //       return text.replace(/\s+/g, " ").trim();   // Collapse spaces/newlines
  //     };

  //     // Filter only relevant news
  //     const filteredNews = results.filter((item) => {
  //       const text = `${item.title || ""} ${item.snippet || ""}`.toLowerCase();
  //       return visaKeywords.some((kw) => text.includes(kw));
  //     });

  //     // Map results with cleaned content
  //     const newsData = filteredNews.map((article) => ({
  //       title: article.title ? article.title.trim() : "No Title",
  //       url: article.url,
  //       snippet: article.snippet ? article.snippet.trim() : "",
  //       full_content: cleanText(article.raw_content),
  //       published_date: article.published_date || null,
  //     }));

  //     return {
  //       status: true,
  //       total: newsData.length,
  //       data: newsData,
  //     };
  //   } catch (error) {
  //     console.error("Tavily API Error:", error.message);
  //     return {
  //       status: false,
  //       message: "Failed to fetch visa and immigration news",
  //     };
  //   }
  // }

  async getSerpiNews(countryFilter) {
    try {
      const allCountries = [
        "Canada", "US", "Australia", "Germany", "New Zealand", "India", "China", "UK",
        "Afghanistan", "Armenia", "Bangladesh", "Bhutan", "China", "India", "Indonesia", "Iran", "Iraq", "Israel",
        "Japan"];

      const countries = countryFilter
        ? allCountries.filter(c => c.toLowerCase() === countryFilter.toLowerCase())
        : allCountries;

      const visaKeywords = [
        "visa", "immigration", "migrant", "migration", "citizenship",
        "h-1b", "student visa", "residency", "green card",
        "passport", "travel ban", "work permit", "asylum", "refugee"
      ];

      let allNews = [];

      for (const country of countries) {
        try {
          const query = `visa and immigration news ${country}`;
          const response = await axios.get("https://serpapi.com/search.json", {
            params: {
              api_key: process.env.SERPAPI_API_KEY,
              engine: "google_news",
              q: query,
              hl: "en",
              gl: "us",
              num: 20,
            },
          });

          const articles = response.data.news_results || [];

          const filtered = articles.filter(a =>
            visaKeywords.some(kw => (a.title + " " + (a.snippet || "")).toLowerCase().includes(kw))
          );

          const limit = countryFilter ? filtered.length : 5;

          const newsData = await Promise.all(
            filtered.slice(0, limit).map(async article => {
              let fullContent = "";
              try {
                const htmlRes = await axios.get(article.link, { timeout: 5000 });
                const $ = cheerio.load(htmlRes.data);
                fullContent = $("p").map((i, el) => $(el).text()).get().join(" ").replace(/\s+/g, " ").trim();
              } catch (e) {
                fullContent = "";
              }

              if (fullContent && fullContent.length > 50) {
                return {
                  country,
                  title: article.title || "No Title",
                  url: article.link,
                  snippet: article.snippet || "",
                  full_content: fullContent,
                  published_date: article.date || null,
                  source: article.source || "",
                  _timestamp: article.date ? new Date(article.date).getTime() : 0,
                };
              } else {
                return null;
              }
            })
          );

          allNews = allNews.concat(newsData.filter(n => n !== null));

        } catch (err) {
          console.log("Failed to fetch news for", country, err.message);
        }
      }

      allNews.sort((a, b) => b._timestamp - a._timestamp);

      return {
        status: true,
        total: allNews.length,
        data: allNews.map(({ _timestamp, ...rest }) => rest),
      };

    } catch (error) {
      console.error("Service Error:", error.message);
      return { status: false, message: "Failed to fetch visa news" };
    }
  }




}


export default new NewsService();
