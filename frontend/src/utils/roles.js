export const ADMIN_ROLE = "admin";
export const MANAGER_ROLE = "manager";
export const CASHIER_ROLE = "cashier";
export const TICKET_CHECKER_ROLE = "ticket_checker";
export const CUSTOMER_ROLE = "customer";

export const OPERATION_ROLES = [ADMIN_ROLE, MANAGER_ROLE, CASHIER_ROLE, TICKET_CHECKER_ROLE];

export const roleHomePath = (role) => {
  if (role === ADMIN_ROLE) return "/admin";
  if (role === MANAGER_ROLE) return "/manager";
  if (role === CASHIER_ROLE) return "/cashier";
  if (role === TICKET_CHECKER_ROLE) return "/checker";
  return "/";
};

export const roleOwnsPath = (role, path) => {
  const home = roleHomePath(role);
  return home === "/" ? !path.startsWith("/admin") && !path.startsWith("/manager") && !path.startsWith("/cashier") && !path.startsWith("/checker") : path === home || path.startsWith(`${home}/`);
};

export const isOperationRole = (role) => OPERATION_ROLES.includes(role);
