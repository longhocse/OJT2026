import { z } from "zod";

const phonePattern = /^\+?[0-9\s.-]{8,20}$/;
const optionalText = (max) => z.string().trim().max(max).optional().or(z.literal(""));
const relation = z.object({ id: z.string().uuid("ID không hợp lệ.") });
const optionalNumber = (schema) =>
  z.preprocess((value) => (value === "" || value === null ? undefined : value), schema.optional());

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Email không hợp lệ.")
    .max(255)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Vui lòng nhập mật khẩu.").max(128),
});

export const registerSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email("Email không hợp lệ.")
      .max(255)
      .transform((value) => value.toLowerCase()),
    password: z
      .string()
      .min(8, "Mật khẩu phải có ít nhất 8 ký tự.")
      .max(128, "Mật khẩu không được quá 128 ký tự.")
      .regex(/[a-z]/, "Mật khẩu phải có chữ thường.")
      .regex(/[A-Z]/, "Mật khẩu phải có chữ hoa.")
      .regex(/[0-9]/, "Mật khẩu phải có chữ số."),
    confirmPassword: z.string(),
    name: z.string().trim().min(1, "Họ tên là bắt buộc.").max(100),
    phone: z
      .string()
      .trim()
      .max(20)
      .regex(phonePattern, "Số điện thoại không hợp lệ.")
      .optional()
      .or(z.literal("")),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận không khớp.",
  })
  .transform(({ confirmPassword: _confirmPassword, ...payload }) => payload);

export const movieSchema = z.object({
  director: optionalText(200),
  cast: optionalText(2000),
  language: optionalText(100),
  country: optionalText(100),
  age_rating: optionalText(20),
  title: z.string().trim().min(1, "Tên phim là bắt buộc.").max(200),
  description: optionalText(10000),
  genreIds: z.array(z.string().uuid()).max(20).default([]),
  duration: z.coerce.number().int("Thời lượng phải là số nguyên.").min(1).max(1000),
  poster_url: z.string().url("URL poster không hợp lệ.").max(500).optional().or(z.literal("")),
  trailer_url: z.string().url("URL trailer không hợp lệ.").max(500).optional().or(z.literal("")),
  release_date: z.string().date("Ngày phát hành không hợp lệ.").optional().or(z.literal("")),
  status: z.enum(["coming_soon", "now_showing", "ended"]),
});

export const movieFilterSchema = z.object({
  genre: optionalText(100),
  minRating: optionalNumber(z.coerce.number().min(1).max(5)),
  sortBy: z.enum(["release_date", "popular"]),
  status: z.enum(["coming_soon", "now_showing", "ended"]),
  page: z.coerce.number().int().min(1),
  limit: z.coerce.number().int().min(1).max(100),
});

export const cinemaSchema = z.object({
  name: z.string().trim().min(1, "Tên rạp là bắt buộc.").max(100),
  address: optionalText(255),
  city: optionalText(50),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(phonePattern, "Số điện thoại không hợp lệ.")
    .optional()
    .or(z.literal("")),
});

export const genreSchema = z.object({
  name: z.string().trim().min(1, "Tên thể loại là bắt buộc.").max(100),
  description: optionalText(500),
});

const seatSchema = z.object({
  id: z.string().uuid("ID ghế không hợp lệ.").optional(),
  row: z
    .string()
    .trim()
    .min(1, "Hàng ghế là bắt buộc.")
    .max(2)
    .regex(/^[A-Za-z]{1,2}$/, "Hàng ghế chỉ được chứa chữ cái.")
    .transform((value) => value.toUpperCase()),
  number: z.coerce.number().int().min(1).max(999),
  type: z.enum(["standard", "vip", "couple"]),
  status: z.enum(["available", "disabled"]),
});

export const roomSchema = z
  .object({
    name: z.string().trim().min(1, "Tên phòng là bắt buộc.").max(50),
    theater: relation,
    seats: z.array(seatSchema).min(1, "Phòng phải có ít nhất một ghế.").max(1000),
  })
  .superRefine((value, context) => {
    const positions = new Set();
    value.seats.forEach((seat, index) => {
      const position = `${seat.row.toUpperCase()}:${seat.number}`;
      if (positions.has(position)) {
        context.addIssue({
          code: "custom",
          path: ["seats", index],
          message: `Ghế ${seat.row.toUpperCase()}${seat.number} bị trùng.`,
        });
      }
      positions.add(position);
    });
  });

export const showSchema = z
  .object({
    start_time: z.coerce.date({ message: "Thời gian bắt đầu không hợp lệ." }),
    end_time: z.coerce.date({ message: "Thời gian kết thúc không hợp lệ." }),
    price: z.coerce.number().positive("Giá phải lớn hơn 0."),
    screen: relation,
    movie: relation,
  })
  .refine((value) => value.end_time > value.start_time, {
    path: ["end_time"],
    message: "Thời gian kết thúc phải sau thời gian bắt đầu.",
  });

export const reviewSchema = z.object({
  rating: z.coerce.number().min(1, "Rating tối thiểu là 1.").max(5, "Rating tối đa là 5."),
  comment: optionalText(5000),
});

export const checkoutSchema = z.object({
  paymentMethod: z.enum(["credit_card", "vnpay", "momo", "cash"], {
    message: "Phương thức thanh toán không hợp lệ.",
  }),
});
