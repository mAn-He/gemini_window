import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import fs from "fs";
import path from "path";

// Converts local file information to a GenerativePart object.
function fileToGenerativePart(filePath: string, mimeType: string) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
      mimeType,
    },
  };
}

export class MultimodalAIService {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  public async generateContent(prompt: string, filePath: string, mimeType: string) {
    const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    const generationConfig = {
      temperature: 0.4,
      topK: 32,
      topP: 1,
      maxOutputTokens: 4096,
    };

    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    try {
      console.log(`[MultimodalService] Generating content for file: ${filePath} with prompt: "${prompt}"`);

      const imagePart = fileToGenerativePart(filePath, mimeType);

      const parts = [
        { text: prompt },
        imagePart,
      ];

      const result = await model.generateContent({
        contents: [{ role: "user", parts }],
        generationConfig,
        safetySettings,
      });

      const responseText = result.response.text();
      console.log(`[MultimodalService] Successfully generated content.`);
      return responseText;

    } catch (error) {
      console.error("[MultimodalService] Error generating content:", error);
      throw new Error("Failed to generate multimodal content.");
    }
  }
}
