// Utility functions for consistent date handling across the app
// Ensures dates are treated consistently between form input and display

/**
 * Converts a date input value to ISO format while maintaining local date
 * This prevents timezone shifting issues where selected date differs from saved date
 */
export const dateInputToISO = (dateInput: string): string => {
  // Ensure the date is treated as local by adding time component
  const dateLocal = new Date(dateInput + 'T00:00:00');
  return dateLocal.toISOString().split('T')[0];
};

/**
 * Formats a date string for display, ensuring consistency with input values
 * Uses the same local date logic to prevent display discrepancies
 */
export const formatDateForDisplay = (dateString: string): string => {
  // Parse the date as local to match how it was saved
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('pt-BR');
};

/**
 * Converts ISO date string to format suitable for date input field
 */
export const formatDateForInput = (dateString: string): string => {
  return dateString; // ISO format is already compatible with input[type="date"]
};