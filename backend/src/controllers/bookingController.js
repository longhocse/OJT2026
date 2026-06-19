// backend/src/controllers/bookingController.js
const { AppDataSource } = require("../config/database");

exports.createBooking = async (req, res) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    const { showId, seatIds, paymentMethod } = req.body;
    const userId = req.user.id;
    const showRepo = queryRunner.manager.getRepository("Show");
    const seatRepo = queryRunner.manager.getRepository("Seat");
    const bookingRepo = queryRunner.manager.getRepository("Booking");
    const bookingSeatRepo = queryRunner.manager.getRepository("BookingSeat");

    const show = await showRepo.findOne({ 
      where: { id: showId }, 
      relations: {
        movie: true,
        screen: true
      }
    });
    if (!show) throw new Error("Show not found");

    const seats = await seatRepo.findByIds(seatIds);
    for (const seat of seats) {
      // Check occupied
      const occupied = await bookingSeatRepo
        .createQueryBuilder("bs")
        .innerJoin("bs.booking", "b")
        .where("b.showId = :showId", { showId })
        .andWhere("b.status = 'confirmed'")
        .andWhere("bs.seatId = :seatId", { seatId: seat.id })
        .getOne();
      if (occupied) throw new Error(`Seat ${seat.row}${seat.number} occupied`);
      if (seat.status === "locked" && seat.locked_until > new Date())
        throw new Error(`Seat ${seat.row}${seat.number} locked`);
      // Lock seat
      seat.status = "locked";
      seat.locked_until = new Date(Date.now() + 10 * 60 * 1000);
      await queryRunner.manager.save(seat);
    }

    const basePrice = parseFloat(show.price);
    let totalPrice = 0;
    for (const seat of seats) {
      let price = basePrice;
      if (seat.type === "vip") price *= 1.5;
      if (seat.type === "couple") price *= 1.8;
      totalPrice += price;
    }

    const booking = bookingRepo.create({
      user: { id: userId },
      show: { id: showId },
      total_price: totalPrice,
      status: "confirmed",
      payment_method: paymentMethod,
    });
    await queryRunner.manager.save(booking);

    for (const seat of seats) {
      let price = basePrice;
      if (seat.type === "vip") price *= 1.5;
      if (seat.type === "couple") price *= 1.8;
      const bookingSeat = bookingSeatRepo.create({
        booking,
        seat,
        price,
        status: "confirmed",
      });
      await queryRunner.manager.save(bookingSeat);
      seat.status = "occupied";
      seat.locked_until = null;
      await queryRunner.manager.save(seat);
    }

    await queryRunner.commitTransaction();
    res.status(201).json({
      message: "Booking created",
      bookingId: booking.id,
      totalPrice,
      seats: seats.map(s => `${s.row}${s.number}`),
    });
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error("❌ Create booking error:", error);
    res.status(400).json({ message: error.message });
  } finally {
    await queryRunner.release();
  }
};

// SỬA: Dùng object syntax cho relations
exports.getBookingById = async (req, res) => {
  try {
    const repo = AppDataSource.getRepository("Booking");
    const booking = await repo.findOne({
      where: { id: req.params.id },
      relations: {
        user: true,
        show: {
          movie: true,
          screen: {
            theater: true
          }
        },
        bookingSeats: {
          seat: true
        }
      }
    });
    if (!booking) return res.status(404).json({ message: "Not found" });
    res.json(booking);
  } catch (error) {
    console.error("❌ Get booking error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// SỬA: Dùng object syntax cho relations
exports.getUserBookings = async (req, res) => {
  try {
    const repo = AppDataSource.getRepository("Booking");
    const bookings = await repo.find({
      where: { user: { id: req.params.userId } },
      relations: {
        show: {
          movie: true
        },
        bookingSeats: {
          seat: true
        }
      },
      order: { created_at: "DESC" },
    });
    res.json(bookings);
  } catch (error) {
    console.error("❌ Get user bookings error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.cancelBooking = async (req, res) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    const repo = queryRunner.manager.getRepository("Booking");
    const booking = await repo.findOne({
      where: { id: req.params.id },
      relations: {
        show: true,
        bookingSeats: {
          seat: true
        }
      }
    });
    if (!booking) return res.status(404).json({ message: "Not found" });
    
    const showTime = new Date(booking.show.start_time);
    const hoursDiff = (showTime - new Date()) / (1000 * 60 * 60);
    if (hoursDiff < 2) return res.status(400).json({ message: "Cannot cancel within 2 hours" });
    
    booking.status = "cancelled";
    await queryRunner.manager.save(booking);
    
    for (const bs of booking.bookingSeats) {
      bs.seat.status = "available";
      bs.seat.locked_until = null;
      await queryRunner.manager.save(bs.seat);
    }
    await queryRunner.commitTransaction();
    res.json({ message: "Cancelled" });
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error("❌ Cancel booking error:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    await queryRunner.release();
  }
};

exports.lockSeats = async (req, res) => {
  try {
    const { seatIds, duration = 600 } = req.body;
    const seatRepo = AppDataSource.getRepository("Seat");
    await seatRepo.update(seatIds, {
      status: "locked",
      locked_until: new Date(Date.now() + duration * 1000),
    });
    res.json({ message: "Seats locked", expiresIn: duration });
  } catch (error) {
    console.error("❌ Lock seats error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.unlockSeats = async (req, res) => {
  try {
    const { seatIds } = req.body;
    const seatRepo = AppDataSource.getRepository("Seat");
    await seatRepo.update(seatIds, { status: "available", locked_until: null });
    res.json({ message: "Seats unlocked" });
  } catch (error) {
    console.error("❌ Unlock seats error:", error);
    res.status(500).json({ message: "Server error" });
  }
};