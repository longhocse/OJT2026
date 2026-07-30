export const ADMIN_ROLE = "admin";
export const MANAGER_ROLE = "manager";
export const CASHIER_ROLE = "cashier";
export const TICKET_CHECKER_ROLE = "ticket_checker";
export const CUSTOMER_ROLE = "customer";

export const OPERATION_ROLES = [ADMIN_ROLE, MANAGER_ROLE, CASHIER_ROLE, TICKET_CHECKER_ROLE];

export const roleHomePath = (role) => {
  if (role === ADMIN_ROLE || role === MANAGER_ROLE) return "/admin";
  if (role === CASHIER_ROLE) return "/admin/bookings";
  if (role === TICKET_CHECKER_ROLE) return "/admin/payments";
  return "/";
};

export const isOperationRole = (role) => OPERATION_ROLES.includes(role);
