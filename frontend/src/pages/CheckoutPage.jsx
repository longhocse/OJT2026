import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import api from "../services/api";
import { setCredentials } from "../redux/slices/authSlice";

const checkoutSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().regex(/^(0[3-9][0-9]{8})$/, "Invalid Vietnamese phone number"),
  email: z.string().email("Invalid email"),
  promoCode: z.string().optional(),
});

const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { selectedSeats, show, totalAmount } = location.state || {};
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("credit_card");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    },
  });

  useEffect(() => {
    if (!selectedSeats || !show) {
      navigate("/");
    }
  }, [selectedSeats, show, navigate]);

  const serviceFee = 10000;
  const subtotal = totalAmount || selectedSeats?.length * show?.price || 0;
  const finalTotal = subtotal + serviceFee - promoDiscount;

  const handleApplyPromo = () => {
    // Fake promo validation
    const code = document.getElementById("promoCode").value;
    if (code === "MOVIE10") {
      setPromoDiscount(20000);
      setPromoError("");
    } else if (code === "WELCOME") {
      setPromoDiscount(15000);
      setPromoError("");
    } else {
      setPromoError("Invalid promo code");
      setPromoDiscount(0);
    }
  };

  const onSubmit = async (data) => {
    if (!selectedSeats || selectedSeats.length === 0) {
      alert("Please select seats");
      return;
    }
    setLoading(true);
    try {
      const bookingData = {
        showId: show.id,
        seatIds: selectedSeats.map((s) => s.id),
        paymentMethod,
        userInfo: data,
      };
      const response = await api.post("/bookings", bookingData);
      navigate("/success", {
        state: {
          booking: response.data,
          show,
          seats: selectedSeats,
          total: finalTotal,
        },
      });
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  if (!selectedSeats || !show) return null;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 md:px-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Summary */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <div className="bg-surface-container rounded-xl p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <img
                  src={show.movie?.poster_url || "/placeholder.jpg"}
                  alt={show.movie?.title}
                  className="w-16 h-24 object-cover rounded"
                />
                <div>
                  <h3 className="font-semibold">{show.movie?.title}</h3>
                  <p className="text-sm text-on-surface-variant">
                    {new Date(show.start_time).toLocaleString()}
                  </p>
                  <p className="text-sm">{show.screen?.theater?.name}</p>
                </div>
              </div>
              <div className="border-t border-white/10 pt-4">
                <p className="flex justify-between">
                  <span>Seats:</span>
                  <span>{selectedSeats.map((s) => `${s.row}${s.number}`).join(", ")}</span>
                </p>
                <p className="flex justify-between mt-2">
                  <span>Subtotal:</span>
                  <span>{subtotal.toLocaleString()} VND</span>
                </p>
                <p className="flex justify-between mt-2">
                  <span>Service fee:</span>
                  <span>{serviceFee.toLocaleString()} VND</span>
                </p>
                {promoDiscount > 0 && (
                  <p className="flex justify-between mt-2 text-secondary">
                    <span>Discount:</span>
                    <span>-{promoDiscount.toLocaleString()} VND</span>
                  </p>
                )}
                <div className="border-t border-white/10 mt-4 pt-4">
                  <p className="flex justify-between text-xl font-bold">
                    <span>Total:</span>
                    <span className="text-primary">{finalTotal.toLocaleString()} VND</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Checkout Form */}
        <div className="lg:col-span-2 order-1 lg:order-2">
          <div className="bg-surface-container rounded-xl p-6">
            <h2 className="text-xl font-bold mb-6">Payment Details</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name *</label>
                  <input
                    {...register("name")}
                    className="w-full px-4 py-2 rounded-lg bg-surface-container-high border border-white/10 focus:border-primary outline-none"
                  />
                  {errors.name && (
                    <p className="text-error text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone *</label>
                  <input
                    {...register("phone")}
                    placeholder="0912345678"
                    className="w-full px-4 py-2 rounded-lg bg-surface-container-high border border-white/10 focus:border-primary outline-none"
                  />
                  {errors.phone && (
                    <p className="text-error text-sm mt-1">{errors.phone.message}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  {...register("email")}
                  type="email"
                  className="w-full px-4 py-2 rounded-lg bg-surface-container-high border border-white/10 focus:border-primary outline-none"
                />
                {errors.email && (
                  <p className="text-error text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* Promo Code */}
              <div>
                <label className="block text-sm font-medium mb-1">Promo Code</label>
                <div className="flex gap-2">
                  <input
                    id="promoCode"
                    className="flex-1 px-4 py-2 rounded-lg bg-surface-container-high border border-white/10 focus:border-primary outline-none"
                    placeholder="Enter code"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30"
                  >
                    Apply
                  </button>
                </div>
                {promoError && <p className="text-error text-sm mt-1">{promoError}</p>}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium mb-3">Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  {["credit_card", "vnpay", "momo", "cash"].map((method) => (
                    <label
                      key={method}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${paymentMethod === method
                          ? "border-primary bg-primary/10"
                          : "border-white/10 hover:border-white/20"
                        }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method}
                        checked={paymentMethod === method}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="accent-primary"
                      />
                      <span className="capitalize">
                        {method === "credit_card"
                          ? "Credit Card"
                          : method === "vnpay"
                            ? "VNPay"
                            : method === "momo"
                              ? "MoMo"
                              : "Cash at Theater"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary text-white font-semibold rounded-lg disabled:opacity-50"
              >
                {loading ? "Processing..." : `Pay ${finalTotal.toLocaleString()} VND`}
              </motion.button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;