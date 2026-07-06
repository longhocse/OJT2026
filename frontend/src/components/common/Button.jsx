import React from "react";
import { motion } from "framer-motion";

const Button = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled = false,
  onClick,
  type = "button",
  className = "",
  ...props
}) => {
  const baseStyles =
    "rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2";

  const variants = {
    primary: "bg-primary-600 hover:bg-primary-700 text-white shadow-lg hover:shadow-xl",
    secondary:
      "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white",
    outline: "border-2 border-primary-600 text-primary-600 hover:bg-primary-600 hover:text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <motion.button
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </motion.button>
  );
};

export default Button;
