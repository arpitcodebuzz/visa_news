require('dotenv').config()

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = "llama-3.1-8b-instant";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export default {
  GROQ_API_KEY,
  GROQ_MODEL,
  GROQ_URL,
};

