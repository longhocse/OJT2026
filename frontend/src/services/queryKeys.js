export const queryKeys = {
  movies: {
    all: ["movies"],
    lists: ["movies", "list"],
    list: (params) => ["movies", "list", params],
    details: ["movies", "detail"],
    detail: (id) => ["movies", "detail", id],
    reviews: (id) => ["movies", "detail", id, "reviews"],
  },
  shows: {
    all: ["shows"],
    list: (params) => ["shows", "list", params],
    adminList: (params) => ["shows", "admin", "list", params],
    detail: (id) => ["shows", "detail", id],
    seats: (id) => ["shows", "detail", id, "seats"],
  },
  bookings: {
    all: ["bookings"],
    mine: ["bookings", "me"],
    detail: (id) => ["bookings", "detail", id],
  },
  users: {
    all: ["users"],
    list: (params) => ["users", "list", params],
  },
  cinemas: {
    all: ["cinemas"],
    list: ["cinemas", "list"],
    adminList: (params) => ["cinemas", "admin", "list", params],
    detail: (id) => ["cinemas", "detail", id],
  },
  rooms: {
    all: ["rooms"],
    list: (params) => ["rooms", "list", params],
    detail: (id) => ["rooms", "detail", id],
  },
  genres: {
    all: ["genres"],
    list: ["genres", "list"],
  },
  recommendations: {
    all: ["recommendations"],
    personal: ["recommendations", "personal"],
    trending: ["recommendations", "trending"],
  },
  admin: {
    dashboard: (params = {}) => ["admin", "dashboard", params],
    bookings: {
      all: ["admin", "bookings"],
      list: (params) => ["admin", "bookings", "list", params],
      detail: (id) => ["admin", "bookings", "detail", id],
    },
    payments: {
      all: ["admin", "payments"],
      list: (params) => ["admin", "payments", "list", params],
    },
    auditLogs: {
      all: ["admin", "auditLogs"],
      list: (params) => ["admin", "auditLogs", "list", params],
    },
  },
};
