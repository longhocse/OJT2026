const { handleChatQuery } = require("../services/chatbotService");

exports.handleChatMessage = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || message.trim() === "") {
            return res.status(400).json({ error: "Vui lòng nhập nội dung tin nhắn." });
        }

        // Gọi service AI để xử lý câu hỏi
        const reply = await handleChatQuery(message);

        res.json({ reply });
    } catch (error) {
        console.error("Chatbot Error:", error);
        res.status(500).json({ error: "Lỗi hệ thống chatbot. Vui lòng thử lại sau." });
    }
};