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

const movie = z.object({
  title: z.string().trim().min(1).max(200),
  description: optionalText(10000),
  genre: optionalText(100),
  rating: z.coerce.number().min(1).max(5).optional(),
  duration: z.coerce.number().int().min(1).max(1000),
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
const room = z.object({
  name: z.string().trim().min(1).max(50),
  total_seats: z.coerce.number().int().min(1).max(1000),
  layout_json: optionalText(100000),
  theater: relation,
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
  cinemaCreate: validateRequest({ body: cinema }),
  cinemaUpdate: validateRequest({
    body: cinema.partial().refine((value) => Object.keys(value).length > 0, {
      message: "At least one cinema field is required",
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
  roomUpdate: validateRequest({
    body: room.partial().refine((value) => Object.keys(value).length > 0, {
      message: "At least one room field is required",
    }),
  }),
  showList: validateRequest({
    query: z.object({
      movieId: optionalQueryUuid,
      theaterId: optionalQueryUuid,
      date: z.iso.date().optional(),
    }),
  }),
  showCreate: validateRequest({ body: show }),
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
};
