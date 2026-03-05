// backend/utils/normalizeEmail.js
export const normalizeEmail = (email) => {
  return email?.trim().toLowerCase();
};