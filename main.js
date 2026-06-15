import fs from "fs";
import path from "path";
import process from "process";
import axios from "axios";
import "dotenv/config";

const apiKey = process.env.OPENROUTER_API_KEY;
const modelName = process.env.MODEL_NAME;

function readPromptFile(filename) {
  try {
    return fs.readFileSync(path.resolve(filename), "utf-8");
  } catch (err) {
    console.error("An error occurred");
  }
}

async function callLLM(promptText) {
  try {
    if (!apiKey || !modelName) {
      console.error("OPENROUTER_API_KEY or MODEL_NAME is missing");
      return;
    }

    const url = "https://openrouter.ai/api/v1/chat/completions";
    const body = {
      model: modelName,
      messages: [{ role: "user", content: promptText }],
    };

    const resp = await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
    const data = resp.data || {};
    const text =
      data?.choices?.[0]?.message?.content ||
      data?.output?.[0]?.content?.[0]?.text ||
      data?.choices?.[0]?.text ||
      JSON.stringify(data);

    return String(text).trim();
  } catch (error) {
    console.error("API Call failed:", error);
  }
}

async function runPipeline() {
  const customerQuery = process.argv[2];

  if (!customerQuery) {
    console.error("No customer query.");
    return;
  }

  const p1 = readPromptFile("prompt_1.txt");
  const p1Prompt = p1.replace("{{CUSTOMER_QUERY}}", customerQuery);
  const intentOutput = await callLLM(p1Prompt);

  const p2 = readPromptFile("prompt_2.txt");
  const p2Prompt = p2
    .replace("{{CUSTOMER_QUERY}}", customerQuery)
    .replace("{{INTENT}}", intentOutput);
  const candidatesOutput = await callLLM(p2Prompt);

  const p3 = readPromptFile("prompt_3.txt");
  const p3Prompt = p3
    .replace("{{CUSTOMER_QUERY}}", customerQuery)
    .replace("{{CANDIDATES}}", candidatesOutput);
  const categoryOutput = await callLLM(p3Prompt);

  const p4 = readPromptFile("prompt_4.txt");
  const p4Prompt = p4
    .replace("{{CUSTOMER_QUERY}}", customerQuery)
    .replace("{{CATEGORY}}", categoryOutput);
  const extractedDetailsOutput = await callLLM(p4Prompt);

  const p5 = readPromptFile("prompt_5.txt");
  const p5Prompt = p5
    .replace("{{CUSTOMER_QUERY}}", customerQuery)
    .replace("{{CATEGORY}}", categoryOutput)
    .replace("{{EXTRACTED_DETAILS}}", extractedDetailsOutput);
  const finalCustomerReply = await callLLM(p5Prompt);

  console.log(finalCustomerReply);
}

runPipeline();

// node main.js "Can I get a loan for 2 million Naira?"
// or
// pnpm dev "Can I get a loan for 2 million Naira?"
