import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { StructuredOutputParser } from 'langchain/output_parsers';

// --- Zod Schemas for Structured Output ---

const fabricObjectSchema = z.object({
    type: z.string().describe("e.g., 'rect', 'circle', 'textbox'"),
    left: z.number().optional(),
    top: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    fill: z.string().optional().describe("e.g., 'red', '#FF0000'"),
    text: z.string().optional(),
    // Allow other properties but don't enforce them
}).passthrough();


const addCommandSchema = z.object({
    command: z.literal('add'),
    object: fabricObjectSchema.describe("The fabric.js object to add to the canvas."),
});

const modifyCommandSchema = z.object({
    command: z.literal('modify'),
    targetId: z.string().describe("The 'name' property of the object to modify."),
    object: fabricObjectSchema.describe("An object containing the properties to update."),
});

const removeCommandSchema = z.object({
    command: z.literal('remove'),
    targetId: z.string().describe("The 'name' property of the object to remove."),
});

const noOpCommandSchema = z.object({
    command: z.literal('noop'),
    reasoning: z.string().describe("The reasoning for not performing any action."),
});

// Union of all possible commands
const commandSchema = z.union([addCommandSchema, modifyCommandSchema, removeCommandSchema, noOpCommandSchema]);

export class CanvasService {
    private model: ChatGoogleGenerativeAI;
    private parser: StructuredOutputParser<typeof commandSchema>;

    constructor(geminiApiKey: string) {
        this.model = new ChatGoogleGenerativeAI({
            apiKey: geminiApiKey,
            modelName: 'gemini-2.5-pro',
            temperature: 0.1,
            generationConfig: { responseMimeType: 'application/json' },
        });
        this.parser = StructuredOutputParser.fromZodSchema(commandSchema);
    }

    public async generateCanvasUpdate(userPrompt: string, canvasState: any): Promise<z.infer<typeof commandSchema>> {
        const formatInstructions = this.parser.getFormatInstructions();

        const prompt = ChatPromptTemplate.fromMessages([
            ['system', `You are an AI assistant for a Fabric.js canvas. Your goal is to translate user requests into structured JSON commands to manipulate the canvas.

You can add, modify, or remove objects. When modifying or removing, you MUST use the 'name' property of the object as the targetId. The 'name' property serves as a unique identifier.

If the user's request is ambiguous or doesn't require a change, use the 'noop' command.

Current Canvas State (objects are identified by their 'name' property):
\`\`\`json
{canvasState}
\`\`\`

{formatInstructions}`],
            ['human', 'User Request: {prompt}'],
        ]);

        const chain = prompt.pipe(this.model).pipe(this.parser);

        try {
            const result = await chain.invoke({
                prompt: userPrompt,
                canvasState: JSON.stringify(canvasState, null, 2),
                formatInstructions: formatInstructions,
            });
            console.log("Canvas AI generated command:", result);
            return result;
        } catch (error) {
            console.error("Error generating canvas update from AI:", error);
            return {
                command: 'noop',
                reasoning: 'An internal error occurred while processing the AI command.',
            };
        }
    }
}
