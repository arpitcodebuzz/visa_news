require('dotenv').config()

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = "llama3-8b-8192";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export default {
  GROQ_API_KEY,
  GROQ_MODEL,
  GROQ_URL,
};

