import axios from "axios";

export interface ChatOffer {
  message: string;
  timestamp: string;
  characterName: string;
  item: {
    name: string;
    price: string;
    stashTab: string;
    position: {
      left: number;
      top: number;
    };
  };
}

export class ChatService {
  private baseUrl = "http://localhost:7555"; // Assuming the same port as other services

  async setChatFilePath(filePath: string): Promise<void> {
    try {
      const response = await axios.post(`${this.baseUrl}/chat`, { filePath });
      if (response.status !== 200) {
        throw new Error("Failed to set chat file path");
      }
    } catch (error) {
      console.error("Error setting chat file path:", error);
      throw error;
    }
  }

  async getOffers(): Promise<ChatOffer[]> {
    try {
      const response = await axios.get<ChatOffer[]>(
        `${this.baseUrl}/chat/offers`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching chat offers:", error);
      throw error;
    }
  }
}

export const chatService = new ChatService();
