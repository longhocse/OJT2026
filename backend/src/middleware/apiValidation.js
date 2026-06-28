const { validateRequest, z } = require("./validationMiddleware");

const UUID_MESSAGE = "Must be a valid UUID";
const uuid = z.string().uuid({ message: UUID_MESSAGE });
const optionalQueryUuid = z.string().uuid({ message: UUID_MESSAGE }).optional();
const optionalText = (max) => z.string().trim().max(max).optional().or(z.literal(""));
const relation = z.object({ id: uuid });
const idParam = (name = "id") =>
  validateRequest({
    params: z.object({ [name]: uuid }),
  });
const pagination = {
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
};
const dateRangeQuery = z
  .object({
    dateFrom: z.iso.date().optional(),
    dateTo: z.iso.date().optional(),
  })
  .refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
    path: ["dateTo"],
    message: "dateTo must be on or after dateFrom",
  });

const movie = z.object({
  title: z.string().trim().min(1).max(200),
  description: optionalText(10000),
  genreIds: z.array(uuid).max(20).default([]),
  duration: z.coerce.number().int().min(1).max(1000),
  director: optionalText(200),
  cast: optionalText(2000),
  language: optionalText(100),
  country: optionalText(100),
  age_rating: optionalText(20),
  poster_url: z.string().url().max(500).optional().or(z.literal("")),
  trailer_url: z.string().url().max(500).optional().or(z.literal("")),
  release_date: z.iso.date().optional().or(z.literal("")),
  status: z.enum(["coming_soon", "now_showing", "ended"]).optional(),
});
const movieUpdate = movie.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one movie field is required",
});

const cinema = z.object({
  name: z.string().trim().min(1).max(100),
  address: optionalText(255),
  city: optionalText(50),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^\+?[0-9\s.-]{8,20}$/, "Must be a valid phone number")
    .optional()
    .or(z.literal("")),
});
const genre = z.object({
  name: z.string().trim().min(1).max(100),
  description: optionalText(500),
});
const seat = z.object({
  id: uuid.optional(),
  row: z
    .string()
    .trim()
    .min(1)
    .max(2)
    .regex(/^[A-Za-z]{1,2}$/, "Seat row must contain only letters")
    .transform((value) => value.toUpperCase()),
  number: z.coerce.number().int().min(1).max(999),
  type: z.enum(["standard", "vip", "couple"]),
  status: z.enum(["available", "disabled"]),
});
const room = z
  .object({
    name: z.string().trim().min(1).max(50),
    theater: relation,
    seats: z.array(seat).min(1).max(1000),
  })
  .superRefine((value, context) => {
    const positions = new Set();
    const ids = new Set();
    value.seats.forEach((item, index) => {
      const position = `${item.row.toUpperCase()}:${item.number}`;
      if (positions.has(position)) {
        context.addIssue({
          code: "custom",
          path: ["seats", index],
          message: `Duplicate seat position ${item.row.toUpperCase()}${item.number}`,
        });
      }
      positions.add(position);

      if (item.id) {
        const normalizedId = item.id.toLowerCase();
        if (ids.has(normalizedId)) {
          context.addIssue({
            code: "custom",
            path: ["seats", index, "id"],
            message: "Duplicate seat id",
          });
        }
        ids.add(normalizedId);
      }
    });
  });
const show = z
  .object({
    start_time: z.coerce.date(),
    end_time: z.coerce.date(),
    price: z.coerce.number().positive(),
    screen: relation,
    movie: relation,
  })
  .refine((value) => value.end_time > value.start_time, {
    path: ["end_time"],
    message: "Must be after start_time",
  });
const seatIds = z
  .array(uuid)
  .min(1)
  .max(20)
  .refine((values) => new Set(values.map((value) => value.toLowerCase())).size === values.length, {
    message: "Seat IDs must not contain duplicates",
  });

module.exports = {
  idParam,
  authRegister: validateRequest({
    body: z.object({
      email: z
        .email()
        .max(255)
        .transform((value) => value.toLowerCase()),
      password: z
        .string()
        .min(8)
        .max(128)
        .regex(/[a-z]/, "Must contain a lowercase letter")
        .regex(/[A-Z]/, "Must contain an uppercase letter")
        .regex(/[0-9]/, "Must contain a number"),
      name: z.string().trim().min(1).max(100),
      phone: z
        .string()
        .trim()
        .max(20)
        .regex(/^\+?[0-9\s.-]{8,20}$/, "Must be a valid phone number")
        .optional()
        .or(z.literal("")),
    }),
  }),
  authLogin: validateRequest({
    body: z.object({
      email: z
        .email()
        .max(255)
        .transform((value) => value.toLowerCase()),
      password: z.string().min(1).max(128),
    }),
  }),
  profileUpdate: validateRequest({
    body: z
      .object({
        name: z.string().trim().min(1).max(100).optional(),
        phone: z
          .string()
          .trim()
          .max(20)
          .regex(/^\+?[0-9\s.-]{8,20}$/, "Must be a valid phone number")
          .nullable()
          .optional(),
      })
      .refine((value) => Object.keys(value).length > 0, {
        message: "At least one profile field is required",
      }),
  }),
  changePassword: validateRequest({
    body: z.object({
      currentPassword: z.string().min(1).max(128),
      newPassword: z
        .string()
        .min(8)
        .max(128)
        .regex(/[a-z]/, "Must contain a lowercase letter")
        .regex(/[A-Z]/, "Must contain an uppercase letter")
        .regex(/[0-9]/, "Must contain a number"),
    }),
  }),
  forgotPassword: validateRequest({
    body: z.object({
      email: z
        .email()
        .max(255)
        .transform((value) => value.toLowerCase()),
    }),
  }),
  resetPassword: validateRequest({
    body: z.object({
      token: z.string().min(32).max(256),
      newPassword: z
        .string()
        .min(8)
        .max(128)
        .regex(/[a-z]/, "Must contain a lowercase letter")
        .regex(/[A-Z]/, "Must contain an uppercase letter")
        .regex(/[0-9]/, "Must contain a number"),
    }),
  }),
  verifyEmail: validateRequest({
    body: z.object({
      token: z.string().min(32).max(256),
    }),
  }),
  resendVerification: validateRequest({
    body: z.object({
      email: z
        .email()
        .max(255)
        .transform((value) => value.toLowerCase()),
    }),
  }),
  movieList: validateRequest({
    query: z.object({
      genre: z.string().trim().max(100).optional(),
      minRating: z.coerce.number().min(1).max(5).optional(),
      sortBy: z.enum(["release_date", "popular"]).optional(),
      status: z.enum(["coming_soon", "now_showing", "ended"]).optional(),
      ...pagination,
    }),
  }),
  movieCreate: validateRequest({ body: movie }),
  movieUpdate: validateRequest({ body: movieUpdate }),
  reviewCreate: validateRequest({
    params: z.object({ movieId: uuid }),
    body: z.object({
      rating: z.coerce.number().min(1).max(5),
      comment: optionalText(5000),
    }),
  }),
  reviewParams: validateRequest({
    params: z.object({ movieId: uuid, reviewId: uuid }),
  }),
  reviewUpdate: validateRequest({
    body: z
      .object({
        rating: z.coerce.number().min(1).max(5).optional(),
        comment: optionalText(5000),
      })
      .refine((value) => Object.keys(value).length > 0, {
        message: "At least one review field is required",
      }),
  }),
  cinemaCreate: validateRequest({ body: cinema }),
  cinemaUpdate: validateRequest({
    body: cinema.partial().refine((value) => Object.keys(value).length > 0, {
      message: "At least one cinema field is required",
    }),
  }),
  adminCinemaList: validateRequest({
    query: z.object({
      ...pagination,
      search: z.string().trim().max(100).optional(),
      status: z.enum(["active", "inactive", "all"]).optional(),
    }),
  }),
  genreCreate: validateRequest({ body: genre }),
  genreUpdate: validateRequest({
    body: genre.partial().refine((value) => Object.keys(value).length > 0, {
      message: "At least one genre field is required",
    }),
  }),
  roomList: validateRequest({ query: z.object({ cinemaId: optionalQueryUuid }) }),
  roomCreate: validateRequest({ body: room }),
  roomUpdate: validateRequest({ body: room }),
  showList: validateRequest({
    query: z.object({
      movieId: optionalQueryUuid,
      theaterId: optionalQueryUuid,
      date: z.iso.date().optional(),
    }),
  }),
  showCreate: validateRequest({ body: show }),
  showUpdate: validateRequest({ body: show }),
  adminShowList: validateRequest({
    query: z.object({
      ...pagination,
      movieId: optionalQueryUuid,
      theaterId: optionalQueryUuid,
      screenId: optionalQueryUuid,
      date: z.iso.date().optional(),
      status: z.enum(["scheduled", "in_progress", "cancelled", "completed"]).optional(),
    }),
  }),
  showCancel: validateRequest({
    body: z.object({ reason: z.string().trim().min(5).max(450) }),
  }),
  adminBookingList: validateRequest({
    query: z
      .object({
        ...pagination,
        search: z.string().trim().max(100).optional(),
        status: z.enum(["pending_payment", "confirmed", "cancelled", "expired", "used"]).optional(),
        paymentStatus: z
          .enum(["pending", "paid", "failed", "cancelled", "partially_refunded", "refunded"])
          .optional(),
        movieId: optionalQueryUuid,
        cinemaId: optionalQueryUuid,
        dateFrom: z.iso.date().optional(),
        dateTo: z.iso.date().optional(),
      })
      .refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
        path: ["dateTo"],
        message: "dateTo must be on or after dateFrom",
      }),
  }),
  adminBookingCancel: validateRequest({
    body: z.object({ reason: z.string().trim().min(5).max(450) }),
  }),
  adminDashboardStats: validateRequest({ query: dateRangeQuery }),
  adminAuditLogList: validateRequest({
    query: z.object({
      ...pagination,
      action: z.string().trim().max(100).optional(),
      resourceType: z.string().trim().max(100).optional(),
      actorUserId: optionalQueryUuid,
    }),
  }),
  adminPaymentList: validateRequest({
    query: z.object({
      ...pagination,
      search: z.string().trim().max(100).optional(),
      provider: z.enum(["mock", "cash", "legacy"]).optional(),
      status: z
        .enum(["pending", "paid", "failed", "cancelled", "partially_refunded", "refunded"])
        .optional(),
    }),
  }),
  paymentRefund: validateRequest({
    body: z.object({ amount: z.coerce.number().positive().optional() }),
  }),
  ticketCheckIn: validateRequest({ body: z.object({ qrPayload: z.string().min(20).max(2000) }) }),
  bookingCreate: validateRequest({
    body: z.object({
      showId: uuid,
      seatIds,
      paymentMethod: z.enum(["credit_card", "vnpay", "momo", "cash"]),
      lockToken: uuid,
    }),
  }),
  seatLock: validateRequest({
    body: z.object({
      showId: uuid,
      seatIds,
      duration: z.coerce.number().int().min(30).max(900).optional(),
    }),
  }),
  seatUnlock: validateRequest({
    body: z.object({ showId: uuid, seatIds, lockToken: uuid }),
  }),
  userIdParam: validateRequest({ params: z.object({ userId: uuid }) }),
  usersList: validateRequest({
    query: z.object({
      ...pagination,
      search: z.string().trim().max(100).optional(),
    }),
  }),
  adminUserUpdate: validateRequest({
    body: z
      .object({
        role: z.enum(["customer", "admin"]).optional(),
        is_active: z.boolean().optional(),
      })
      .refine((value) => Object.keys(value).length > 0, {
        message: "At least one access field is required",
      }),
  }),
};
