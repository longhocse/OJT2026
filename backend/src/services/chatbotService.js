// backend/src/services/chatbotService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { AppDataSource } = require("../config/database");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* ============================================================
 * 0. RETRY HELPER — chống lỗi 429 (rate limit) / lỗi tạm thời
 *    khi gọi Gemini API. Tự thử lại với thời gian chờ tăng dần.
 * ============================================================ */
async function callGeminiWithRetry(fn, { retries = 3, baseDelayMs = 1200 } = {}) {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;

            const status = err?.status || err?.response?.status;
            const message = err?.message || "";
            const isRateLimit = status === 429 || /rate.?limit|quota|RESOURCE_EXHAUSTED/i.test(message);
            const isTransient = status === 500 || status === 503 || /timeout|ECONNRESET|fetch failed/i.test(message);

            // Chỉ retry với lỗi tạm thời (rate limit / server lỗi / mạng chập chờn)
            if ((isRateLimit || isTransient) && attempt < retries) {
                const wait = baseDelayMs * Math.pow(2, attempt); // 1.2s -> 2.4s -> 4.8s...
                console.warn(`[Gemini] Lỗi tạm thời (${status || message}), thử lại lần ${attempt + 1} sau ${wait}ms`);
                await new Promise((r) => setTimeout(r, wait));
                continue;
            }
            // Lỗi không thuộc dạng tạm thời (vd sai API key, model không tồn tại) -> ném ra luôn
            throw err;
        }
    }
    throw lastErr;
}

/* ============================================================
 * 1. MÔ TẢ SCHEMA DATABASE DÙNG CHO TEXT-TO-SQL
 *    ⚠️ CHỈ liệt kê các bảng/cột được phép cho chatbot truy cập.
 *    TUYỆT ĐỐI KHÔNG thêm bảng users/accounts hay các cột
 *    password/mat_khau/token/... vào đây — model chỉ biết những
 *    gì được liệt kê trong schema này, không tự suy ra bảng khác.
 *
 *    👉 BẠN CẦN CHỈNH LẠI DANH SÁCH BẢNG/CỘT NÀY CHO KHỚP VỚI
 *       DATABASE THẬT CỦA BẠN (thêm/bớt bảng, đổi tên cột...).
 * ============================================================ */
const DB_SCHEMA_DESCRIPTION = `
Các bảng được phép truy vấn (SQL Server):

movies(id, title, description, duration_minutes, poster_url, trailer_url, rating, status, is_active, release_date)
genres(id, name)
movie_genres(movie_id, genre_id)
theaters(id, name, address, phone, opening_hours, is_active)
screens(id, theater_id, name, screen_type, total_seats)
shows(id, movie_id, screen_id, start_time, end_time, price, status)
ticket_prices(id, type, price, is_active)
promotions(id, title, description, discount_percent, start_date, end_date, is_active)

Quan hệ chính:
- movies 1-n movie_genres n-1 genres
- theaters 1-n screens 1-n shows
- shows.movie_id -> movies.id

TUYỆT ĐỐI KHÔNG được truy vấn, nhắc đến, hay giả định có các bảng: users, accounts, customers,
tai_khoan, admin, employees, payments, hoặc bất kỳ bảng/cột nào chứa thông tin đăng nhập,
mật khẩu (password, mat_khau), token, OTP, số thẻ ngân hàng — những bảng này KHÔNG có trong
danh sách trên nên không được phép dùng.
`;

/* ============================================================
 * 2. DANH SÁCH CHẶN CỨNG (defense-in-depth ở tầng ứng dụng)
 *    Dù model có lỡ sinh ra SQL đụng tới các từ khoá này,
 *    hệ thống sẽ từ chối chạy câu SQL đó.
 * ============================================================ */
const FORBIDDEN_KEYWORDS = [
    "password", "mat_khau", "matkhau", "pass_word",
    "users", "user_accounts", "accounts", "account",
    "tai_khoan", "taikhoan", "admin", "employees", "nhan_vien",
    "customers", "khach_hang", "payments", "payment",
    "token", "otp", "secret", "credential", "card_number", "so_the",
];

// Chỉ cho phép câu lệnh SELECT thuần, không cho phép nhiều câu lệnh,
// không cho phép các từ khoá thay đổi dữ liệu / cấu trúc DB.
const FORBIDDEN_SQL_KEYWORDS = [
    "insert", "update", "delete", "drop", "alter", "create",
    "truncate", "exec", "execute", "merge", "grant", "revoke",
    "sp_", "xp_", "--", "/*", "*/", ";--",
];

function isSqlSafe(sql) {
    const lower = sql.toLowerCase();

    if (!lower.trim().startsWith("select")) return false;
    if ((sql.match(/;/g) || []).length > 1) return false; // chỉ cho phép tối đa 1 dấu ; ở cuối
    if (FORBIDDEN_SQL_KEYWORDS.some((kw) => lower.includes(kw))) return false;
    if (FORBIDDEN_KEYWORDS.some((kw) => lower.includes(kw))) return false;

    return true;
}

/* ============================================================
 * 3. MODEL PHÂN TÍCH INTENT (bắt buộc trả JSON thuần)
 * ============================================================ */
const analyzerModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `Bạn là bộ phân tích câu hỏi cho chatbot rạp phim MovieTap.
Nhiệm vụ DUY NHẤT của bạn: đọc câu hỏi người dùng và trả về JSON thuần (không markdown, không giải thích).

Cấu trúc JSON:
{
  "intent": "TÌM_PHIM" | "TÌM_SUẤT_CHIẾU" | "THÔNG_TIN_RẠP" | "GIÁ_VÉ" | "TRA_CỨU_KHÁC" | "CHAT_CHUNG",
  "parameters": {
    "genre": "string hoặc null (thể loại phim)",
    "date": "string YYYY-MM-DD hoặc null. CHỈ điền khi người dùng nói RÕ ngày (hôm nay, tối nay, ngày mai, 20/07...). Nếu người dùng KHÔNG nhắc đến ngày, để null - KHÔNG tự suy ra ngày hiện tại.",
    "time": "string HH:MM hoặc null (giờ cụ thể người dùng muốn xem từ mấy giờ trở đi)",
    "movie_title": "string hoặc null (tên phim, giữ nguyên như user gõ, không tự dịch/đổi)",
    "theater_name": "string hoặc null (tên rạp/chi nhánh cụ thể nếu có nhắc)"
  }
}

Quy tắc chọn intent:
- "TÌM_PHIM": hỏi về danh sách phim, phim theo thể loại, phim đang chiếu/sắp chiếu.
- "TÌM_SUẤT_CHIẾU": hỏi giờ chiếu, suất chiếu, "mấy giờ", "còn suất nào không".
- "THÔNG_TIN_RẠP": hỏi địa chỉ, giờ mở cửa, chi nhánh, tiện ích của rạp.
- "GIÁ_VÉ": hỏi giá vé, loại vé, combo bắp nước giá bao nhiêu.
- "TRA_CỨU_KHÁC": câu hỏi CẦN dữ liệu thực tế từ hệ thống (vd: khuyến mãi đang có, phòng chiếu loại nào, phim sắp ra mắt, số ghế của phòng chiếu...) nhưng KHÔNG khớp 4 loại trên.
- "CHAT_CHUNG": chào hỏi, cảm ơn, hỏi cách đặt vé/thanh toán chung chung, hoặc câu hỏi hoàn toàn ngoài phạm vi rạp phim, KHÔNG cần dữ liệu thực tế.

Nếu không chắc chắn giữa TRA_CỨU_KHÁC và CHAT_CHUNG, hãy chọn TRA_CỨU_KHÁC nếu câu hỏi có vẻ cần tra số liệu/thông tin cụ thể từ hệ thống.`,
    generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
    },
});

/* ============================================================
 * 4. MODEL SINH SQL (dùng cho intent TRA_CỨU_KHÁC)
 * ============================================================ */
const sqlGeneratorModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `Bạn là bộ sinh câu lệnh SQL Server (T-SQL) CHỈ ĐỌC cho chatbot rạp phim MovieTap.

Schema được phép sử dụng:
${DB_SCHEMA_DESCRIPTION}

QUY TẮC BẮT BUỘC:
1. CHỈ được sinh ra DUY NHẤT một câu lệnh SELECT. Không được dùng INSERT/UPDATE/DELETE/DROP/ALTER/CREATE/EXEC hay bất kỳ lệnh thay đổi dữ liệu nào.
2. CHỈ được dùng các bảng/cột có trong schema ở trên. Không tự bịa ra bảng/cột không có trong danh sách.
3. TUYỆT ĐỐI KHÔNG được đụng đến bảng/cột liên quan tài khoản, mật khẩu, thông tin đăng nhập, thanh toán cá nhân — vì các bảng đó KHÔNG có trong schema được cấp.
4. Luôn giới hạn kết quả bằng "TOP 10" ngay sau SELECT để tránh trả về quá nhiều dữ liệu.
5. Nếu câu hỏi của người dùng không thể trả lời bằng schema hiện có, trả về CHÍNH XÁC chuỗi: KHÔNG_THỂ_TRUY_VẤN

Chỉ trả về JSON thuần theo cấu trúc:
{ "sql": "câu lệnh SELECT ở đây, hoặc KHÔNG_THỂ_TRUY_VẤN" }

Không thêm markdown, không thêm dấu backtick, không giải thích gì thêm.`,
    generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
    },
});

/* ============================================================
 * 5. MODEL TRÒ CHUYỆN CHUNG (dùng khi intent = CHAT_CHUNG)
 *    Không đụng DB, chỉ trả lời tự nhiên trong phạm vi rạp phim
 * ============================================================ */
const chatModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `Bạn là trợ lý ảo thân thiện của rạp phim MovieTap.
- Trả lời ngắn gọn, tự nhiên, lịch sự, có thể dùng emoji vừa phải.
- Nếu người dùng chào hỏi/cảm ơn -> đáp lại thân thiện.
- Nếu người dùng hỏi cách đặt vé, thanh toán, đổi/trả vé, chính sách chung -> trả lời theo hiểu biết chung về rạp chiếu phim, không bịa số liệu cụ thể vì bạn không có quyền truy cập dữ liệu thực.
- Không trả lời các câu hỏi ngoài phạm vi dịch vụ rạp phim một cách quá dài dòng, hãy khéo léo hướng người dùng quay lại chủ đề rạp phim nếu phù hợp.
- Luôn trả lời bằng tiếng Việt.`,
    generationConfig: {
        temperature: 0.6,
    },
});

/* ============================================================
 * 6. MODEL DIỄN GIẢI KẾT QUẢ SQL THÀNH CÂU TRẢ LỜI TỰ NHIÊN
 *    (dùng cho intent TRA_CỨU_KHÁC, sau khi đã có dữ liệu thật)
 * ============================================================ */
const explainResultModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `Bạn là trợ lý rạp phim MovieTap. Bạn sẽ nhận được: câu hỏi gốc của người dùng và
dữ liệu JSON lấy từ database. Nhiệm vụ: diễn giải dữ liệu đó thành câu trả lời tự nhiên, ngắn gọn,
dễ hiểu bằng tiếng Việt. CHỈ dùng đúng thông tin có trong dữ liệu JSON được cung cấp, TUYỆT ĐỐI
KHÔNG bịa thêm thông tin không có trong dữ liệu. Nếu dữ liệu là mảng rỗng, trả lời rằng không tìm
thấy thông tin phù hợp và gợi ý người dùng hỏi rõ hơn.`,
    generationConfig: {
        temperature: 0.3,
    },
});

/* ============================================================
 * 7. Phân tích intent + parameters từ câu hỏi
 * ============================================================ */
async function analyzeUserQuery(query) {
    try {
        const result = await callGeminiWithRetry(() => analyzerModel.generateContent(query));
        const content = result.response.text();
        return JSON.parse(content);
    } catch (err) {
        console.error("Lỗi phân tích intent:", err?.message || err);
        return { intent: "CHAT_CHUNG", parameters: {} };
    }
}

/* ============================================================
 * 8. Truy vấn Database theo intent (các intent đã biết trước)
 *    LƯU Ý: params là MẢNG GIÁ TRỊ THUẦN, placeholder SQL dùng
 *    @0, @1, @2... theo đúng thứ tự push vào params (driver mssql
 *    của TypeORM không hỗ trợ named parameter @date, @genre...)
 * ============================================================ */
async function executeDatabaseQuery(intent, parameters = {}) {
    const params = [];
    let sql;

    if (intent === "TÌM_PHIM") {
        sql = `
      SELECT DISTINCT TOP 5 m.title, m.poster_url, m.rating
      FROM movies m
      LEFT JOIN movie_genres mg ON m.id = mg.movie_id
      LEFT JOIN genres g ON mg.genre_id = g.id
      WHERE m.status = 'now_showing' AND m.is_active = 1
    `;
        if (parameters.genre) {
            sql += ` AND LOWER(g.name) LIKE LOWER(@${params.length})`;
            params.push(`%${parameters.genre}%`);
        }
        sql += ` ORDER BY m.rating DESC`;
    }

    else if (intent === "TÌM_SUẤT_CHIẾU") {
        sql = `
      SELECT TOP 5 s.start_time, s.price, m.title,
             t.name AS theater_name, sc.name AS screen_name
      FROM shows s
      JOIN movies m ON s.movie_id = m.id
      JOIN screens sc ON s.screen_id = sc.id
      JOIN theaters t ON sc.theater_id = t.id
      WHERE s.status = 'scheduled'
    `;

        if (parameters.date) {
            sql += ` AND CAST(s.start_time AS DATE) = CAST(@${params.length} AS DATE)`;
            params.push(parameters.date);
        } else {
            sql += ` AND s.start_time >= GETDATE()`;
        }

        if (parameters.time) {
            sql += ` AND CAST(s.start_time AS TIME) >= CAST(@${params.length} AS TIME)`;
            params.push(parameters.time);
        }

        if (parameters.movie_title) {
            sql += ` AND LOWER(m.title) LIKE LOWER(@${params.length})`;
            params.push(`%${parameters.movie_title}%`);
        }

        if (parameters.theater_name) {
            sql += ` AND LOWER(t.name) LIKE LOWER(@${params.length})`;
            params.push(`%${parameters.theater_name}%`);
        }

        sql += ` ORDER BY s.start_time ASC`;
    }

    else if (intent === "THÔNG_TIN_RẠP") {
        sql = `
      SELECT TOP 5 t.name, t.address, t.phone, t.opening_hours
      FROM theaters t
      WHERE t.is_active = 1
    `;
        if (parameters.theater_name) {
            sql += ` AND LOWER(t.name) LIKE LOWER(@${params.length})`;
            params.push(`%${parameters.theater_name}%`);
        }
    }

    else if (intent === "GIÁ_VÉ") {
        // Giả định có bảng ticket_prices(type, price). Đổi tên bảng/cột
        // cho khớp schema thực tế của bạn nếu khác.
        sql = `
      SELECT TOP 10 type, price
      FROM ticket_prices
      WHERE is_active = 1
      ORDER BY price ASC
    `;
    }

    else {
        return null;
    }

    try {
        return await AppDataSource.query(sql, params);
    } catch (err) {
        console.error("Lỗi truy vấn DB:", err.message);
        return { error: true };
    }
}

/* ============================================================
 * 9. Format câu trả lời từ kết quả DB (không tốn thêm quota AI)
 * ============================================================ */
function formatReply(intent, dbResult) {
    if (dbResult && dbResult.error) {
        return "Xin lỗi, hệ thống đang gặp trục trặc khi tra cứu dữ liệu. Bạn vui lòng thử lại sau ít phút nhé.";
    }

    if (!Array.isArray(dbResult) || dbResult.length === 0) {
        if (intent === "TÌM_SUẤT_CHIẾU") {
            return "Hiện mình chưa tìm thấy suất chiếu phù hợp. Bạn có thể cho mình biết rõ hơn tên phim hoặc ngày muốn xem không?";
        }
        if (intent === "TÌM_PHIM") {
            return "Hiện mình chưa tìm thấy phim phù hợp với yêu cầu. Bạn thử đổi thể loại khác xem sao nhé!";
        }
        if (intent === "THÔNG_TIN_RẠP") {
            return "Mình chưa tìm thấy thông tin rạp bạn hỏi. Bạn có thể cho biết tên rạp/khu vực cụ thể hơn không?";
        }
        if (intent === "GIÁ_VÉ") {
            return "Hiện mình chưa có thông tin giá vé cập nhật. Bạn vui lòng liên hệ trực tiếp rạp để biết giá chính xác nhé.";
        }
        return "Mình chưa tìm thấy thông tin phù hợp.";
    }

    if (intent === "TÌM_PHIM") {
        const lines = dbResult.map((m) => `🎬 ${m.title} (đánh giá ${m.rating ?? "chưa có"})`);
        return `Đây là một vài phim đang chiếu bạn có thể thích:\n${lines.join("\n")}`;
    }

    if (intent === "TÌM_SUẤT_CHIẾU") {
        const lines = dbResult.map((s) => {
            const time = new Date(s.start_time).toLocaleString("vi-VN");
            return `🎬 ${s.title} - ${time} tại ${s.theater_name} (phòng ${s.screen_name}), giá ${Number(s.price).toLocaleString("vi-VN")}đ`;
        });
        return `Mình tìm được các suất chiếu sau:\n${lines.join("\n")}`;
    }

    if (intent === "THÔNG_TIN_RẠP") {
        const lines = dbResult.map(
            (t) => `🏢 ${t.name}\n📍 ${t.address}\n📞 ${t.phone ?? "chưa cập nhật"}\n🕐 ${t.opening_hours ?? "chưa cập nhật"}`
        );
        return lines.join("\n\n");
    }

    if (intent === "GIÁ_VÉ") {
        const lines = dbResult.map((p) => `💵 ${p.type}: ${Number(p.price).toLocaleString("vi-VN")}đ`);
        return `Bảng giá vé hiện tại:\n${lines.join("\n")}`;
    }

    return "Mình chưa tìm thấy thông tin phù hợp.";
}

/* ============================================================
 * 10. Xử lý intent TRA_CỨU_KHÁC: text-to-SQL có kiểm soát
 * ============================================================ */
async function handleGenericDatabaseQuery(query) {
    // Bước A: nhờ Gemini sinh câu SQL SELECT dựa trên schema đã cấp
    let sql;
    try {
        const result = await callGeminiWithRetry(() =>
            sqlGeneratorModel.generateContent(`Câu hỏi của người dùng: "${query}"`)
        );
        const parsed = JSON.parse(result.response.text());
        sql = (parsed.sql || "").trim();
    } catch (err) {
        console.error("Lỗi sinh SQL:", err?.message || err);
        return "Xin lỗi, hiện mình chưa tra cứu được thông tin này. Bạn thử hỏi lại theo cách khác được không?";
    }

    if (!sql || sql === "KHÔNG_THỂ_TRUY_VẤN") {
        return "Mình chưa có đủ dữ liệu để trả lời câu hỏi này. Bạn có thể hỏi cụ thể hơn về phim, suất chiếu, rạp hoặc giá vé nhé!";
    }

    // Bước B: kiểm tra an toàn TRƯỚC KHI chạy — chặn mọi thứ ngoài SELECT
    // và mọi bảng/cột nhạy cảm (tài khoản, mật khẩu...)
    if (!isSqlSafe(sql)) {
        console.warn("[SECURITY] Chặn câu SQL không an toàn do AI sinh ra:", sql);
        return "Xin lỗi, mình không thể truy vấn thông tin này.";
    }

    // Bước C: chạy SQL (không có params vì đây là câu do AI tự sinh,
    // không nhận trực tiếp input thô của user chèn vào chuỗi SQL)
    let rows;
    try {
        rows = await AppDataSource.query(sql);
    } catch (err) {
        console.error("Lỗi khi chạy SQL do AI sinh ra:", err.message, "| SQL:", sql);
        return "Xin lỗi, hệ thống gặp trục trặc khi tra cứu dữ liệu này. Bạn thử hỏi lại theo cách khác nhé.";
    }

    // Bước D: diễn giải kết quả thành câu trả lời tự nhiên
    try {
        const explainPrompt = `Câu hỏi gốc: "${query}"\nDữ liệu JSON: ${JSON.stringify(rows).slice(0, 4000)}`;
        const result = await callGeminiWithRetry(() => explainResultModel.generateContent(explainPrompt));
        return result.response.text();
    } catch (err) {
        console.error("Lỗi diễn giải kết quả:", err?.message || err);
        // Fallback: nếu AI diễn giải lỗi, vẫn trả dữ liệu thô cho người dùng thay vì im lặng
        if (Array.isArray(rows) && rows.length > 0) {
            return `Mình tìm được ${rows.length} kết quả:\n${JSON.stringify(rows, null, 2)}`;
        }
        return "Mình chưa tìm thấy thông tin phù hợp với câu hỏi này.";
    }
}

/* ============================================================
 * 11. Trả lời câu hỏi chung bằng AI (intent = CHAT_CHUNG)
 * ============================================================ */
async function answerGeneralQuery(query) {
    try {
        const result = await callGeminiWithRetry(() => chatModel.generateContent(query));
        return result.response.text();
    } catch (err) {
        console.error("Lỗi khi trả lời câu hỏi chung:", err?.message || err);
        return "Xin lỗi, hiện mình chưa thể trả lời câu hỏi này. Bạn thử hỏi lại theo cách khác được không?";
    }
}

/* ============================================================
 * 12. Hàm chính xử lý yêu cầu chat của người dùng
 * ============================================================ */
async function handleChatQuery(query) {
    if (!query || !query.trim()) {
        return "Bạn muốn hỏi mình điều gì về phim, suất chiếu hay rạp chiếu ạ?";
    }

    // Bước 1: phân tích intent + parameters
    const parsed = await analyzeUserQuery(query);
    const intent = parsed.intent || "CHAT_CHUNG";
    const parameters = parsed.parameters || {};

    // Bước 2: câu hỏi chung (chào hỏi, ngoài phạm vi) -> AI trả lời trực tiếp
    if (intent === "CHAT_CHUNG") {
        return await answerGeneralQuery(query);
    }

    // Bước 3: câu hỏi cần dữ liệu nhưng không khớp 4 intent cứng
    // -> dùng text-to-SQL có kiểm soát để tra toàn bộ DB (trừ bảng nhạy cảm)
    if (intent === "TRA_CỨU_KHÁC") {
        return await handleGenericDatabaseQuery(query);
    }

    // Bước 4: các intent đã biết trước -> truy vấn DB bằng câu SQL viết sẵn (an toàn nhất)
    const dbResult = await executeDatabaseQuery(intent, parameters);

    // Bước 5: format câu trả lời (không tốn thêm quota AI)
    return formatReply(intent, dbResult);
}

module.exports = { handleChatQuery };