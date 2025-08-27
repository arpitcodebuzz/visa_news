// services/newsService.js
import Groq from "groq-sdk";
import groqConfig from "../common/config/groq.config.js";
import moment from "moment";

const { GROQ_API_KEY, GROQ_MODEL } = groqConfig;

class NewsService {
  async newsData() {
    try {
      const todayDate = moment().format("DD MMMM YYYY");
      // console.log(todayDate)
      
const prompt = `
You are a visa and immigration news generator.  
Fetch and generate the **latest visa and immigration news** only from the following sources:  

- Canada: IRCC, CIC News, CanadaVisa  
- UK: Home Office, UCAS, VFS Global  
- USA: USCIS, US Visa Bulletin  
- Australia: DHA (Department of Home Affairs)  
- Europe: EU Blue Card Portal, Poland Work Visa Portal  
- Middle East: UAE Immigration, Qatar e-Visa  
- Education Tests: IELTS, PTE, TOEFL  

⚠️ IMPORTANT: Return ONLY valid JSON. No explanations, no markdown, no extra text.  

The JSON must follow exactly this structure:

{
  "country": "All",
  "date_generated": "${todayDate}",
  "news": [
    {
      "country_name": "string",
      "headline": "string",
      "date": "${todayDate}",
      "content": [
        "Paragraph 1...",
        "Paragraph 2...",
        "Paragraph 3..."
      ],
      "source_links": [
        "https://source1.com",
        "https://source2.com"
      ]
    }
  ]
}

Rules:
- Always include at least 10–15 different countries in "news".
- Each article must have **2000–2500 words** across "content".
- "content" must always be an array of multiple paragraphs (not a single long string).
- "source_links" must always be an array (at least one real or placeholder link).
- Never include any text outside the JSON object.
- Prioritize pulling news only from the above official visa/immigration sources.
`;



      // ✅ Initialize Groq SDK
      const groq = new Groq({ apiKey: GROQ_API_KEY });

      // ✅ Call Groq API
      const response = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 5000, // allow enough space for long articles
      });

      // ✅ Extract raw content
      let rawText = response.choices?.[0]?.message?.content || "{}";

      // ✅ Clean markdown if present
      rawText = rawText.trim().replace(/```json|```/g, "");

      // ✅ Extract JSON block only (in case model adds intro text)
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) {
        throw new Error("No JSON object found in response");
      }

      let parsed;
      try {
        parsed = JSON.parse(match[0]);
      } catch (jsonError) {
        console.error("❌ JSON parse error:", jsonError.message, "\nRAW:", rawText);
        return {
          country,
          news: [],
          rawResponse: rawText,
        };
      }

      return parsed;
    } catch (error) {
      console.error("❌ Error in newsData:", error.message);
      return {
        country,
        news: [],
        error: "Failed to fetch visa news",
      };
    }
  }
}

export default new NewsService();
