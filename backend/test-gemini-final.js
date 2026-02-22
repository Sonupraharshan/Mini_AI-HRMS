import OpenAI from 'openai';

const openai = new OpenAI({ 
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  apiKey: "AIzaSyACkjb6uAJdfsZnOGqaWXmHEPM9Xhd91JQ",
});

async function run() {
  try {
    const response = await openai.chat.completions.create({
      model: "gemini-1.5-flash",
      messages: [{ role: "user", content: "TEST JSON, return a json object { \"test\": 1 }" }],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });
    console.log("Success:", response.choices[0].message.content);
  } catch (e) {
    console.error("Error:", e.message);
    if (e.response) {
      console.error(e.response.data);
    }
  }
}

run();
