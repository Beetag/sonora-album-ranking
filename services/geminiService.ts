import { GoogleGenAI, Type } from "@google/genai";
import { Album } from "../types";

// Initialize Gemini Client
// We assume process.env.API_KEY is available as per instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const searchAlbums = async (query: string, year: number): Promise<Album[]> => {
  try {
    const prompt = `
      Search for up to 5 music albums released in the year ${year} that match the search query "${query}".
      For each album, identify if the artist is primarily considered "French" (Francophone) or "International" (Non-Francophone).
      
      Return a JSON array with the following schema for each album:
      - title (string)
      - artist (string)
      - language (string: 'French' or 'International')
      
      Ensure the album actually exists or is very likely to exist.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              artist: { type: Type.STRING },
              language: { type: Type.STRING, enum: ["French", "International"] }
            },
            required: ["title", "artist", "language"]
          }
        }
      }
    });

    const data = JSON.parse(response.text || "[]");

    // Augment with local IDs and placeholder images
    return data.map((item: any, index: number) => ({
      id: `gemini-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      title: item.title,
      artist: item.artist,
      year: year,
      language: item.language as 'French' | 'International',
      // Generate a deterministic but distinct image URL
      coverUrl: `https://picsum.photos/seed/${encodeURIComponent(item.title + item.artist)}/200`
    }));

  } catch (error) {
    console.error("Gemini Search Error:", error);
    return [];
  }
};

export const generateGlobalRankings = async (year: number, category: 'French' | 'International'): Promise<any[]> => {
  // Simulate fetching global data by asking Gemini to hallucinate a "top 10" list for that year
  // This is a creative use of the AI to mock the "Community" aspect
  try {
    const prompt = `
      Generate a fictitious "Community Ranking" of the top 5 ${category} music albums released in ${year}.
      Return a JSON array.
    `;

     const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              artist: { type: Type.STRING },
              score: { type: Type.NUMBER, description: "A fake popularity score between 1 and 100" }
            }
          }
        }
      }
    });

    const data = JSON.parse(response.text || "[]");
    return data.map((item: any, index: number) => ({
       album: {
          id: `global-${index}`,
          title: item.title,
          artist: item.artist,
          year,
          language: category,
          coverUrl: `https://picsum.photos/seed/${encodeURIComponent(item.title)}/200`
       },
       averageRank: index + 1,
       score: item.score,
       voters: Math.floor(Math.random() * 5000) + 100
    }));

  } catch (e) {
    console.error(e);
    return [];
  }
}
