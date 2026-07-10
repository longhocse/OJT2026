import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns";

// Format currency VND
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(amount);
};

// Format date time
export const formatDateTime = (date) => {
  return format(new Date(date), "PPP p");
};

// Format showtime display
export const formatShowtime = (date) => {
  const showDate = new Date(date);
  if (isToday(showDate)) {
    return `Today, ${format(showDate, "h:mm a")}`;
  }
  if (isTomorrow(showDate)) {
    return `Tomorrow, ${format(showDate, "h:mm a")}`;
  }
  return format(showDate, "MMM dd, h:mm a");
};

// Time remaining until show
export const getTimeRemaining = (startTime) => {
  const now = new Date();
  const start = new Date(startTime);
  if (start <= now) return "Started";
  const hours = Math.floor((start - now) / (1000 * 60 * 60));
  const minutes = Math.floor(((start - now) % 3600000) / 60000);
  if (hours > 24) {
    return formatDistanceToNow(start, { addSuffix: true });
  }
  return `${hours}h ${minutes}m remaining`;
};

// Generate seat label
export const getSeatLabel = (row, number) => `${row}${number}`;

// Calculate seat price based on type
export const calculateSeatPrice = (basePrice, seatType) => {
  let price = parseFloat(basePrice);
  if (seatType === "vip") price *= 1.5;
  if (seatType === "couple") price *= 1.8;
  return Math.round(price);
};

// Validate phone number Vietnam
export const isValidPhoneNumber = (phone) => {
  const phoneRegex = /^(0[3-9][0-9]{8})$/;
  return phoneRegex.test(phone);
};

// Validate email
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
  return emailRegex.test(email);
};

// Debounce function
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Truncate text
export const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

// Get rating stars
export const getRatingStars = (rating) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  return { fullStars, hasHalfStar, emptyStars };
};

// Group movies by genre
export const groupByGenre = (movies) => {
  return movies.reduce((acc, movie) => {
    const genres = movie.genre.split(",");
    genres.forEach((genre) => {
      if (!acc[genre.trim()]) acc[genre.trim()] = [];
      acc[genre.trim()].push(movie);
    });
    return acc;
  }, {});
};

// Save to local storage with expiry
export const setWithExpiry = (key, value, ttl) => {
  const item = {
    value,
    expiry: new Date().getTime() + ttl,
  };
  localStorage.setItem(key, JSON.stringify(item));
};

// Get from local storage with expiry check
export const getWithExpiry = (key) => {
  const itemStr = localStorage.getItem(key);
  if (!itemStr) return null;
  const item = JSON.parse(itemStr);
  if (new Date().getTime() > item.expiry) {
    localStorage.removeItem(key);
    return null;
  }
  return item.value;
};
