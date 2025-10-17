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

const { GROQ_API_KEY, GROQ_MODEL } = groqConfig;

const US_RSS_URL = "https://www.uscis.gov/news/rss-feed/59144";
const Cic_RSS_URL = 'https://www.cicnews.com/feed'

// const BASE_URL = 'https://www.cicnews.com/news';

const NEWS_URL = 'https://www.uscis.gov/newsroom/news-releases';  // main USCIS newsroom
const BASE_URL = 'https://www.uscis.gov';

const apiKey = process.env.GNEWS_API_KEY;
console.log("🔑 GNEWS_API_KEY:", process.env.GNEWS_API_KEY);


if (!apiKey) {
  console.error('Missing GNEWS_API_KEY environment variable');
}


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

  async fetchVisaNews(query) {
    try {
      const response = await axios.get("https://gnews.io/api/v4/search", {
        params: {
          q: query,
          lang: "en",
          max: 15,
          token: process.env.GNEWS_API_KEY,
        },
        timeout: 20000,
      });

      const articles = response.data.articles || [];
      let enrichedArticles = [];

      for (const article of articles) {
        let fullContent = article.content || "";

        try {
          const page = await axios.get(article.url, {
            timeout: 8000,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            }
          });

          const $ = cheerio.load(page.data);
          const paragraphs = $("p")
            .map((i, el) => $(el).text().trim())
            .get();

          if (paragraphs.length > 0) {
            fullContent = paragraphs.join("\n\n");
          }
        } catch (scrapeErr) {
          console.warn(`⚠️ Scraping failed for: ${article.url}`);
        }

        // ✅ Always include article, fallback if needed
        enrichedArticles.push({
          ...article,
          content: fullContent || article.description || "",
        });
      }

      return {
        status: true,
        articles: enrichedArticles,
      };
    }
    catch (error) {
      console.error("❌ Visa news error:", error.message);
      return {
        status: false,
        message: "Failed to fetch visa news",
        error: error.message,
      };
    }
  }


  async fetchLatestNews(query) {
    try {
      const feed = await parser.parseURL(Cic_RSS_URL);
      const newsList = [];

      const itemsToFetch = feed.items;

      for (const item of itemsToFetch) {
        let fullContent = [];

        try {
          const { data: html } = await axios.get(item.link, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            timeout: 30000,
          });

          const $ = cheerio.load(html);
          const selectors = ['.td-post-content', '.post-body', '.entry-content', '.post-content'];
          let wrapper;

          for (const sel of selectors) {
            if ($(sel).length) {
              wrapper = $(sel);
              break;
            }
          }

          if (!wrapper || wrapper.text().trim().length < 20) {
            fullContent = ['Full content not available'];
          } else {
            wrapper.find('p, h2, h3, li, strong, em').each((_, el) => {
              const text = $(el).text().trim();
              if (text) fullContent.push(text);
            });

            wrapper.find('table').each((_, table) => {
              const rows = [];
              $(table)
                .find('tr')
                .each((_, tr) => {
                  const cells = [];
                  $(tr)
                    .find('th, td')
                    .each((_, td) => {
                      const text = $(td).text().trim();
                      if (text) cells.push(text);
                    });
                  if (cells.length) rows.push(cells.join(' | '));
                });
              if (rows.length) fullContent.push(rows.join('\n'));
            });

            if (!fullContent.length) fullContent = ['Full content not available'];
          }
        } catch (err) {
          console.error('Error scraping article:', item.link, err.message);
          fullContent = ['Full content not available'];
        }

        newsList.push({
          title: item.title,
          url: item.link,
          summary: item.contentSnippet || '',
          date: item.pubDate,
          fullContent,
        });
      }

      return {
        status: true,
        total: newsList.length,
        data: newsList,
      };
    } catch (err) {
      console.error('Failed to fetch news', err);
      return { status: false, message: 'Failed to fetch news', error: err.message };
    }
  }

  async fetchUSCISNews(limit = 5) {
    try {
      const parser = new RSSParser();
      const feed = await parser.parseURL(US_RSS_URL);

      const items = feed.items.slice(0, limit);

      const unwantedPhrases = [
        "Official websites use .gov",
        "A .gov website belongs to an official government organization",
        "Secure .gov websites use HTTPS",
        "Share sensitive information only on official, secure websites",
        "Sign In",
        "Create Account",
        "Contact us",
        "Multilingual Resources"
      ];

      const articles = await Promise.all(
        items.map(async item => {
          const articleData = {
            title: item.title,
            url: item.link,
            date: item.pubDate,
            summary: item.contentSnippet || item.content || "No summary available",
          };

          try {
            const { data: html } = await axios.get(articleData.url, {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              },
              timeout: 15000,
            });

            const $ = cheerio.load(html);
            const contentWrapper = $(".field--name-body");
            const fullContent = [];

            if (contentWrapper.length) {
              contentWrapper.find("p, li, h2, h3, strong, em").each((_, el) => {
                const text = $(el).text().trim();
                if (
                  text &&
                  !unwantedPhrases.some(phrase => text.toLowerCase().includes(phrase.toLowerCase())) &&
                  !text.toLowerCase().includes(".gov") &&
                  !text.toLowerCase().includes("https://") &&
                  !text.toLowerCase().includes("lock")
                ) {
                  fullContent.push(text);
                }
              });

              contentWrapper.find("table").each((_, table) => {
                const rows = [];
                $(table)
                  .find("tr")
                  .each((_, tr) => {
                    const cells = [];
                    $(tr)
                      .find("th, td")
                      .each((_, td) => {
                        const text = $(td).text().trim();
                        if (
                          text &&
                          !unwantedPhrases.some(phrase => text.toLowerCase().includes(phrase.toLowerCase())) &&
                          !text.toLowerCase().includes(".gov") &&
                          !text.toLowerCase().includes("https://") &&
                          !text.toLowerCase().includes("lock")
                        ) {
                          cells.push(text);
                        }
                      });
                    if (cells.length) rows.push(cells.join(" | "));
                  });
                if (rows.length) fullContent.push(rows.join("\n"));
              });
            }

            articleData.fullContent =
              fullContent.length > 0 ? fullContent : ["Full content not available"];
          } catch (err) {
            console.error("❌ Error scraping:", articleData.url, err.message);
            articleData.fullContent = ["Full content not available"];
          }

          return articleData;
        })
      );

      return {
        status: true,
        total: articles.length,
        data: articles,
      };
    } catch (err) {
      console.error("❌ Failed to fetch USCIS RSS:", err.message);
      return {
        status: false,
        message: "Failed to fetch USCIS RSS",
        error: err.message,
      };
    }
  }
}



export default new NewsService();
