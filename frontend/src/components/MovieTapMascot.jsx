export default function MovieTapMascot({ className = "w-56 h-56" }) {
    return (
        <svg viewBox="0 0 680 520" className={className}>
            <defs>
                <linearGradient id="bucketGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff4d67" />
                    <stop offset="100%" stopColor="#e0243f" />
                </linearGradient>
                <linearGradient id="popGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fff6e0" />
                    <stop offset="100%" stopColor="#ffdf8c" />
                </linearGradient>
                <linearGradient id="reelGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#4d5bff" />
                    <stop offset="100%" stopColor="#2733b0" />
                </linearGradient>
            </defs>

            <circle cx="140" cy="90" r="4" fill="#ffd166" />
            <circle cx="560" cy="120" r="5" fill="#4d5bff" />
            <circle cx="590" cy="300" r="4" fill="#ff4d67" />
            <circle cx="110" cy="340" r="5" fill="#ffd166" />

            <g transform="translate(340,180)">
                <circle cx="0" cy="-60" r="46" fill="url(#reelGrad)" stroke="#1c2696" strokeWidth="2" />
                <circle cx="0" cy="-60" r="12" fill="#f4f5ff" />
                <circle cx="-22" cy="-78" r="8" fill="#f4f5ff" />
                <circle cx="22" cy="-78" r="8" fill="#f4f5ff" />
                <circle cx="-22" cy="-42" r="8" fill="#f4f5ff" />
                <circle cx="22" cy="-42" r="8" fill="#f4f5ff" />

                <path d="M-90 -10 Q-70 -70 0 -70 Q70 -70 90 -10 L96 20 Q0 40 -96 20 Z" fill="url(#popGrad)" stroke="#e8b866" strokeWidth="2" />
                <circle cx="-60" cy="-30" r="16" fill="#fff8e8" stroke="#e8b866" strokeWidth="2" />
                <circle cx="-20" cy="-50" r="18" fill="#fff8e8" stroke="#e8b866" strokeWidth="2" />
                <circle cx="24" cy="-52" r="18" fill="#fff8e8" stroke="#e8b866" strokeWidth="2" />
                <circle cx="62" cy="-28" r="16" fill="#fff8e8" stroke="#e8b866" strokeWidth="2" />
                <circle cx="0" cy="-60" r="16" fill="#fff8e8" stroke="#e8b866" strokeWidth="2" />

                <path d="M-100 15 L100 15 L86 150 Q0 168 -86 150 Z" fill="url(#bucketGrad)" stroke="#b5182e" strokeWidth="2" />
                <path d="M-88 40 L88 40" stroke="#ffffff" strokeWidth="6" opacity="0.35" />
                <path d="M-82 90 L82 90" stroke="#ffffff" strokeWidth="6" opacity="0.25" />

                <ellipse cx="-30" cy="65" rx="15" ry="18" fill="#1c2144" />
                <ellipse cx="30" cy="65" rx="15" ry="18" fill="#1c2144" />
                <circle cx="-26" cy="59" r="5" fill="#ffffff" />
                <circle cx="34" cy="59" r="5" fill="#ffffff" />
                <path d="M-46 90 Q0 118 46 90" fill="none" stroke="#1c2144" strokeWidth="6" strokeLinecap="round" />
                <circle cx="-58" cy="80" r="10" fill="#ff8fa3" opacity="0.6" />
                <circle cx="58" cy="80" r="10" fill="#ff8fa3" opacity="0.6" />

                <path d="M-96 60 Q-140 30 -150 -10" fill="none" stroke="#e0243f" strokeWidth="10" strokeLinecap="round" />
                <circle cx="-152" cy="-16" r="13" fill="#ffdf8c" stroke="#e8b866" strokeWidth="2" />
                <path d="M96 60 Q140 20 130 -20" fill="none" stroke="#e0243f" strokeWidth="10" strokeLinecap="round" />
                <circle cx="132" cy="-26" r="13" fill="#ffdf8c" stroke="#e8b866" strokeWidth="2" />

                <ellipse cx="-46" cy="205" rx="20" ry="10" fill="#1c2144" opacity="0.85" />
                <ellipse cx="46" cy="205" rx="20" ry="10" fill="#1c2144" opacity="0.85" />
            </g>
        </svg>
    );
}