import { GoogleGenAI, FunctionDeclaration, Type, GenerateContentResponse } from "@google/genai";
import { CostCategory, LineItem } from "../types";

// Custom error to signal API key issues back to the UI
export class ApiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiKeyError';
  }
}

// Creates a new client instance for each request to ensure the latest API key is used.
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new ApiKeyError("API key is not available. Please select a key.");
  }
  return new GoogleGenAI({ apiKey });
};

const handleApiError = (error: any): never => {
    console.error("Gemini API Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('API key was reported as leaked') || errorMessage.includes('Requested entity was not found') || errorMessage.includes('PERMISSION_DENIED')) {
        throw new ApiKeyError('Your API key is invalid or has been compromised. Please select a new key.');
    }
    
    throw new Error("There was an error communicating with the AI. Please try again.");
};

export const getAIEstimateSuggestion = async (prompt: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an expert construction estimator. Based on the following user request, provide a brief, structured list of potential assemblies or line items for a job estimate. Format the response as simple text, not markdown. Request: "${prompt}"`,
    });
    return response.text;
  } catch (error) {
    handleApiError(error);
  }
};

const addLineItemFunctionDeclaration: FunctionDeclaration = {
    name: 'addLineItemToEstimate',
    description: 'Adds a new line item to the construction job estimate.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            description: {
                type: Type.STRING,
                description: 'A detailed description of the line item (e.g., "36-inch Bathroom Vanity Cabinet").',
            },
            category: {
                type: Type.STRING,
                description: "The cost category. Must be one of: 'Labor', 'Material', 'Subcontractor', 'Equipment', 'Other'.",
            },
            quantity: {
                type: Type.NUMBER,
                description: 'The quantity of the item.',
            },
            unit: {
                type: Type.STRING,
                description: 'The unit of measure for the quantity (e.g., "ea", "sq ft", "hours").',
            },
            unitCost: {
                type: Type.NUMBER,
                description: 'The cost for a single unit of the item in USD.',
            },
        },
        required: ['description', 'category', 'quantity', 'unit', 'unitCost'],
    },
};

export const getAIAgentResponse = async (prompt: string): Promise<GenerateContentResponse> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Using a more powerful model for agent-like behavior
            contents: `User request: "${prompt}"`,
            config: {
                systemInstruction: `You are an expert construction estimator AI agent. Your goal is to help the user build a complete estimate based on their request.
                1.  Identify all necessary line items (materials, labor, subcontractors, etc.).
                2.  For each item, use your knowledge to determine a realistic, up-to-date market price in USD.
                3.  For every single item you identify, you MUST call the 'addLineItemToEstimate' function to add it to the user's estimate.
                4.  Do not list items in your text response; add them directly using the function.
                5.  After calling the function for all items, provide a brief, friendly summary of the actions you took (e.g., "I've added 5 items for the deck build...").`,
                tools: [
                    { functionDeclarations: [addLineItemFunctionDeclaration] },
                ],
            },
        });
        return response;
    } catch (error) {
        handleApiError(error);
    }
};


export const getAICategoryForDescription = async (description: string): Promise<CostCategory> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Given the expense description: "${description}", classify it into one of these categories: 'Labor', 'Material', 'Subcontractor', 'Equipment', 'Other'. Respond with only the category name, nothing else.`,
    });
    
    const category = response.text.trim() as CostCategory;
    const validCategories: CostCategory[] = ['Labor', 'Material', 'Subcontractor', 'Equipment', 'Other'];
    if (validCategories.includes(category)) {
      return category;
    }
    return 'Other';
  } catch (error) {
    handleApiError(error);
  }
};


export const getAISuggestedPricing = async (description: string): Promise<number> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `For a construction line item described as "${description}", what is a reasonable estimated unit cost in USD? Provide a single number, no symbols or text.`,
        });

        const price = parseFloat(response.text.trim());
        if (isNaN(price)) {
            throw new Error("AI did not return a valid price.");
        }
        return price;
    } catch (error) {
        handleApiError(error);
    }
};

export const getAIAssemblyItems = async (assemblyName: string): Promise<Omit<LineItem, 'id' | 'total'>[]> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are an expert construction estimator. Generate a detailed list of line items for a construction assembly named "${assemblyName}". Include common materials and labor with realistic quantities and per-unit costs in USD. For assemblies specified with dimensions (e.g., 'per sq ft' or '10x10'), base your quantities on that unit.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        items: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    description: { type: Type.STRING },
                                    category: { type: Type.STRING },
                                    quantity: { type: Type.NUMBER },
                                    unit: { type: Type.STRING },
                                    unitCost: { type: Type.NUMBER },
                                },
                                required: ['description', 'category', 'quantity', 'unit', 'unitCost']
                            }
                        }
                    }
                }
            }
        });
        
        const jsonResponse = JSON.parse(response.text);
        return jsonResponse.items || [];
    } catch (error) {
        handleApiError(error);
    }
};
