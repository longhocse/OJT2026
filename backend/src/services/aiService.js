const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

const generateMovieDescription = async ({
    title,
    genre,
    director,
    cast,
    plotOutline = "",
}) => {
    try {
        let prompt = `Hãy viết một đoạn mô tả phim hấp dẫn, dài khoảng 100-150 từ bằng tiếng Việt.

Tên phim: ${title}
Thể loại: ${genre}
Đạo diễn: ${director || "Chưa cập nhật"}
Diễn viên: ${cast || "Chưa cập nhật"}
`;

        if (plotOutline) {
            prompt += `Cốt truyện: ${plotOutline}\n`;
        }

        prompt += `
Yêu cầu:
- Không spoil.
- Văn phong hấp dẫn.
- Phù hợp website đặt vé xem phim.
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        return response.text;
    } catch (err) {
        console.error("Gemini Error:", err);
        // Preserve original error as the cause for better debugging
        throw new Error("Không thể tạo mô tả bằng Gemini AI.", { cause: err });
    }
};

module.exports = {
    generateMovieDescription,
};