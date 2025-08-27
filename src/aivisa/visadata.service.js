// import { OpenAI } from 'openai';
// import dotenv from 'dotenv';
// dotenv.config();

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY
// });

// class VisaService {
//   async getVisaDetails(from, to) {
//     const prompt = `
// Act like a visa consultant. Provide full visa details for a person from ${from} traveling to ${to}. Include:

// 1. Whether a visa is required
// 2. Type(s) of visa available
// 3. Required documents
// 4. Visa fees
// 5. Processing time
// 6. Maximum stay duration
// 7. Notes or conditions (like visa on arrival, online visa, etc.)

// Respond in detailed JSON format.
// `;

//     const chat = await openai.chat.completions.create({
//       model: 'gpt-3.5-turbo',
//       messages: [{ role: 'user', content: prompt }],
//       temperature: 0.7
//     });

//     const result = chat.choices[0].message.content;
//     try {
//       return JSON.parse(result); 
//     } catch {
//       return { response: result };
//     }
//   }
// }


// export default new VisaService();



import  axios from "axios";
// import { GROQ_API_KEY, GROQ_MODEL, GROQ_URL } from "../common/config/groq.config.js";
import groqConfig from "../common/config/groq.config.js";

const { GROQ_API_KEY, GROQ_MODEL, GROQ_URL } = groqConfig;



class visadataService {
  async getVisaInfoService(from, to, purpose = "tourism") {
const prompt = `
You are a Canadian immigration assistant trained using information from https://www.canada.ca/en.html.

User is from: India  
User wants to go to: Canada

Respond ONLY in valid raw JSON — no markdown, comments, or explanation.

Use this structure:

{
  "visas": {
    "study": [
      { "question": "About", "answer": ["...", "..."] },
      { "question": "Eligibility", "answer": ["...", "..."] },
      { "question": "Required Documents", "answer": ["...", "..."] },
      { "question": "Duration", "answer": ["...", "..."] },
      { "question": "Processing Time", "answer": ["...", "..."] },
      { "question": "Fees", "answer": ["...", "..."] },
      { "question": "Steps to Apply", "answer": ["...", "..."] },
      { "question": "Can it lead to PR or Citizenship?", "answer": ["...", "..."] }
    ],
    "tourism": [
      { "question": "About", "answer": ["...", "..."] },
      { "question": "Eligibility", "answer": ["...", "..."] },
      { "question": "Required Documents", "answer": ["...", "..."] },
      { "question": "Duration", "answer": ["...", "..."] },
      { "question": "Processing Time", "answer": ["...", "..."] },
      { "question": "Fees", "answer": ["...", "..."] },
      { "question": "Steps to Apply", "answer": ["...", "..."] },
      { "question": "Can it lead to PR or Citizenship?", "answer": ["...", "..."] }
    ]
  }
}

Each "answer" must be a JSON array of 8–10 plain text lines, based on accurate, up-to-date info consistent with guidance from https://www.canada.ca/en.html.
`;





    const payload = {
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    };

    const headers = {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
       timeout: 30000
    };

    try {
      const response = await axios.post(GROQ_URL, payload, { headers });
      return response.data.choices[0].message.content;
    } catch (err) {
      console.error("Groq Error:", err.response?.data || err.message);
      throw new Error("Failed to fetch visa info from Groq");
    }
  }


}

export default new visadataService()