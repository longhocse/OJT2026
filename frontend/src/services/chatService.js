import api from "./api";

export const chatService = {
    async sendMessage(message) {
        const response = await api.post("/chat/message", { message });
        return response.data;
    },
};