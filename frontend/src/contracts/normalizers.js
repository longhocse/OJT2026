import { getSafeResourceUrl, getSafeYouTubeEmbedUrl } from "../utils/security";

export class ContractError extends Error {
  constructor(resource, message) {
    super(`${resource}: ${message}`);
    this.name = "ContractError";
    this.resource = resource;
  }
}

const object = (value, resource) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractError(resource, "expected an object response");
  }
  return value;
};

const id = (value, resource) => {
  if (typeof value !== "string" || !value) throw new ContractError(resource, "missing id");
  return value;
};

const text = (value, fallback = "") => (typeof value === "string" ? value : fallback);
const nullableText = (value) => (typeof value === "string" && value ? value : null);
const number = (value, resource, field) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new ContractError(resource, `invalid ${field}`);
  return parsed;
};
const nullableDate = (value) => (typeof value === "string" && value ? value : null);

export const normalizeUser = (value) => {
  const raw = object(value, "User");
  return {
    id: id(raw.id, "User"),
    email: text(raw.email),
    name: text(raw.name),
    phone: nullableText(raw.phone),
    role: text(raw.role, "customer"),
    is_active: raw.is_active !== false,
    created_at: nullableDate(raw.created_at),
  };
};

export const normalizeReview = (value) => {
  const raw = object(value, "Review");
  return {
    id: id(raw.id, "Review"),
    rating: number(raw.rating, "Review", "rating"),
    comment: nullableText(raw.comment),
    created_at: nullableDate(raw.created_at),
    user: raw.user
      ? { id: id(raw.user.id, "Review.user"), name: text(raw.user.name, "Người dùng") }
      : null,
  };
};

export const normalizeMovie = (value) => {
  const raw = object(value, "Movie");
  const genres = Array.isArray(raw.genres) ? raw.genres.map(normalizeGenre) : [];
  const genreLabel =
    genres.length > 0 ? genres.map((item) => item.name).join(", ") : text(raw.genre);
  return {
    id: id(raw.id, "Movie"),
    title: text(raw.title),
    description: nullableText(raw.description),
    genres,
    genre: genreLabel,
    rating: number(raw.rating ?? 0, "Movie", "rating"),
    duration: number(raw.duration, "Movie", "duration"),
    director: nullableText(raw.director),
    cast: nullableText(raw.cast),
    language: nullableText(raw.language),
    country: nullableText(raw.country),
    age_rating: nullableText(raw.age_rating),
    poster_url: getSafeResourceUrl(raw.poster_url),
    trailer_url: getSafeYouTubeEmbedUrl(raw.trailer_url),
    release_date: nullableDate(raw.release_date),
    status: text(raw.status, "coming_soon"),
    created_at: nullableDate(raw.created_at),
    reviews: Array.isArray(raw.reviews) ? raw.reviews.map(normalizeReview) : [],
  };
};

export const normalizeGenre = (value) => {
  const raw = object(value, "Genre");
  return {
    id: id(raw.id, "Genre"),
    name: text(raw.name),
    description: nullableText(raw.description),
  };
};

export const normalizeSeat = (value) => {
  const raw = object(value, "Seat");
  return {
    id: id(raw.id, "Seat"),
    row: text(raw.row).trim(),
    number: number(raw.number, "Seat", "number"),
    type: text(raw.type, "standard"),
    status: text(raw.status, "available"),
  };
};

export const normalizeTheater = (value, { includeScreens = true } = {}) => {
  const raw = object(value, "Theater");
  return {
    id: id(raw.id, "Theater"),
    name: text(raw.name),
    address: nullableText(raw.address),
    city: nullableText(raw.city),
    phone: nullableText(raw.phone),
    screens:
      includeScreens && Array.isArray(raw.screens)
        ? raw.screens.map((screen) => normalizeScreen(screen, { includeTheater: false }))
        : [],
  };
};

export const normalizeScreen = (value, { includeTheater = true, includeSeats = true } = {}) => {
  const raw = object(value, "Screen");
  return {
    id: id(raw.id, "Screen"),
    name: text(raw.name),
    total_seats: number(raw.total_seats, "Screen", "total_seats"),
    layout_json: nullableText(raw.layout_json),
    theater:
      includeTheater && raw.theater
        ? normalizeTheater(raw.theater, { includeScreens: false })
        : null,
    seats: includeSeats && Array.isArray(raw.seats) ? raw.seats.map(normalizeSeat) : [],
  };
};

export const normalizeShow = (value) => {
  const raw = object(value, "Show");
  return {
    id: id(raw.id, "Show"),
    start_time: text(raw.start_time),
    end_time: text(raw.end_time),
    price: number(raw.price, "Show", "price"),
    status: text(raw.status, "scheduled"),
    cancellation_reason: nullableText(raw.cancellation_reason),
    cancelled_at: nullableDate(raw.cancelled_at),
    availableSeats:
      raw.availableSeats === undefined
        ? null
        : number(raw.availableSeats, "Show", "availableSeats"),
    movie: raw.movie ? normalizeMovie(raw.movie) : null,
    screen: raw.screen ? normalizeScreen(raw.screen) : null,
  };
};

export const normalizeBookingSeat = (value) => {
  const raw = object(value, "BookingSeat");
  return {
    id: id(raw.id, "BookingSeat"),
    status: text(raw.status, "confirmed"),
    price: number(raw.price, "BookingSeat", "price"),
    seat: raw.seat ? normalizeSeat(raw.seat) : null,
  };
};

export const normalizeBooking = (value) => {
  const raw = object(value, "Booking");
  return {
    id: id(raw.id, "Booking"),
    total_price: number(raw.total_price, "Booking", "total_price"),
    status: text(raw.status, "pending"),
    payment_method: nullableText(raw.payment_method),
    payment_status: text(raw.payment_status, "pending"),
    refunded_amount: number(raw.refunded_amount ?? 0, "Booking", "refunded_amount"),
    cancellation_reason: nullableText(raw.cancellation_reason),
    cancelled_at: nullableDate(raw.cancelled_at),
    expires_at: nullableDate(raw.expires_at),
    ticket_code: nullableText(raw.ticket_code),
    checked_in_at: nullableDate(raw.checked_in_at),
    created_at: nullableDate(raw.created_at),
    user: raw.user ? normalizeUser(raw.user) : null,
    show: raw.show ? normalizeShow(raw.show) : null,
    bookingSeats: Array.isArray(raw.bookingSeats) ? raw.bookingSeats.map(normalizeBookingSeat) : [],
    payment: raw.payment
      ? {
          id: id(raw.payment.id, "Booking.payment"),
          provider: text(raw.payment.provider),
          status: text(raw.payment.status, "pending"),
          amount: number(raw.payment.amount, "Booking.payment", "amount"),
          refunded_amount: number(
            raw.payment.refunded_amount ?? 0,
            "Booking.payment",
            "refunded_amount",
          ),
        }
      : null,
  };
};

export const normalizePayment = (value) => {
  const raw = object(value, "Payment");
  return {
    id: id(raw.id, "Payment"),
    provider: text(raw.provider),
    provider_transaction_id: nullableText(raw.provider_transaction_id),
    amount: number(raw.amount, "Payment", "amount"),
    status: text(raw.status, "pending"),
    paid_at: nullableDate(raw.paid_at),
    failed_at: nullableDate(raw.failed_at),
    refunded_amount: number(raw.refunded_amount ?? 0, "Payment", "refunded_amount"),
    created_at: nullableDate(raw.created_at),
    updated_at: nullableDate(raw.updated_at),
    booking: raw.booking ? normalizeBooking(raw.booking) : null,
  };
};

export const normalizeAuditLog = (value) => {
  const raw = object(value, "AuditLog");
  return {
    id: id(raw.id, "AuditLog"),
    action: text(raw.action),
    resource_type: text(raw.resource_type),
    resource_id: nullableText(raw.resource_id),
    metadata_json: nullableText(raw.metadata_json),
    created_at: nullableDate(raw.created_at),
    actor: raw.actor
      ? {
          id: id(raw.actor.id, "AuditLog.actor"),
          email: text(raw.actor.email),
          name: text(raw.actor.name),
          role: text(raw.actor.role),
        }
      : null,
  };
};

export const normalizePagination = (value) => {
  const raw = object(value, "Pagination");
  return {
    page: number(raw.page, "Pagination", "page"),
    limit: number(raw.limit, "Pagination", "limit"),
    total: number(raw.total, "Pagination", "total"),
    pages: number(raw.pages, "Pagination", "pages"),
  };
};

export const normalizePaginated = (value, itemNormalizer, resource) => {
  const raw = object(value, resource);
  if (!Array.isArray(raw.data)) throw new ContractError(resource, "missing data array");
  return {
    data: raw.data.map(itemNormalizer),
    pagination: normalizePagination(raw.pagination),
  };
};

export const normalizeMoviePage = (value) => normalizePaginated(value, normalizeMovie, "MoviePage");

export const normalizeShowPage = (value) => normalizePaginated(value, normalizeShow, "ShowPage");

export const normalizeUserPage = (value) => ({
  ...normalizePaginated(value, normalizeUser, "UserPage"),
  success: value.success === true,
});

export const normalizeBookingPage = (value) =>
  normalizePaginated(value, normalizeBooking, "BookingPage");

export const normalizeAuditLogPage = (value) =>
  normalizePaginated(value, normalizeAuditLog, "AuditLogPage");

export const normalizeDashboardStats = (value) => {
  const raw = object(value, "DashboardStats");
  return {
    totalBookings: number(raw.totalBookings, "DashboardStats", "totalBookings"),
    confirmedBookings: number(raw.confirmedBookings, "DashboardStats", "confirmedBookings"),
    cancelledBookings: number(raw.cancelledBookings, "DashboardStats", "cancelledBookings"),
    revenue: number(raw.revenue, "DashboardStats", "revenue"),
    refund: number(raw.refund, "DashboardStats", "refund"),
    occupancy: number(raw.occupancy, "DashboardStats", "occupancy"),
    bookedSeats: number(raw.bookedSeats, "DashboardStats", "bookedSeats"),
    capacity: number(raw.capacity, "DashboardStats", "capacity"),
    series: Array.isArray(raw.series)
      ? raw.series.map((item) => ({
          date: text(item.date),
          totalBookings: number(item.totalBookings, "DashboardStats.series", "totalBookings"),
          revenue: number(item.revenue, "DashboardStats.series", "revenue"),
          refund: number(item.refund, "DashboardStats.series", "refund"),
        }))
      : [],
  };
};

export const normalizeBookingResult = (value) => {
  const raw = object(value, "BookingResult");
  if (!Array.isArray(raw.seats)) throw new ContractError("BookingResult", "missing seats array");
  return {
    message: text(raw.message),
    bookingId: id(raw.bookingId, "BookingResult"),
    totalPrice: number(raw.totalPrice, "BookingResult", "totalPrice"),
    seats: raw.seats.map((seat) => text(seat)).filter(Boolean),
    status: text(raw.status, "pending_payment"),
    expiresAt: nullableDate(raw.expiresAt),
    ticketCode: nullableText(raw.ticketCode),
    payment: raw.payment
      ? {
          id: id(raw.payment.id, "BookingResult.payment"),
          provider: text(raw.payment.provider),
          status: text(raw.payment.status, "pending"),
          checkoutUrl: nullableText(raw.payment.checkoutUrl),
        }
      : null,
  };
};
