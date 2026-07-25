import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { chatService } from "../../services/chatService";
const ChatbotWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: "bot", text: "👋 Chào bạn! Tôi là trợ lý MovieTap. Bạn muốn tìm phim hay suất chiếu nào? Cứ hỏi tôi nhé!" }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    useEffect(scrollToBottom, [messages]);



    const handleSend = async () => {
        if (!input.trim()) return;
        const userMsg = input.trim();
        setMessages(prev => [...prev, { role: "user", text: userMsg }]);
        setInput("");
        setLoading(true);

        try {
            const data = await chatService.sendMessage(userMsg);
            setMessages(prev => [...prev, { role: "bot", text: data.reply }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: "bot", text: "Xin lỗi, hệ thống tạm thời bận. Hãy thử lại sau." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
            {isOpen && (
                <div className="w-80 md:w-96 h-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between text-white">
                        <h3 className="font-bold flex items-center gap-2">
                            <span className="bg-white text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm">🎬</span>
                            Trợ lý MovieTap
                        </h3>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 rounded-full p-1 transition">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.role === "user"
                                    ? "bg-blue-600 text-white rounded-br-none"
                                    : "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm rounded-bl-none"
                                    }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {loading && <div className="flex justify-start"><div className="bg-white dark:bg-slate-700 text-slate-500 p-3 rounded-2xl rounded-bl-none shadow-sm animate-pulse">Đang suy nghĩ...</div></div>}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-3 border-t dark:border-slate-700 bg-white dark:bg-slate-800 flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ví dụ: Tối nay có phim gì?"
                            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            disabled={loading}
                        />
                        <button onClick={handleSend} disabled={loading || !input.trim()} className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition">
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            <button onClick={() => setIsOpen(!isOpen)} className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/40 flex items-center justify-center hover:scale-105 transition-transform">
                {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
            </button>
        </div>
    );
};

export default ChatbotWidget;