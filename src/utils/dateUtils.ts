// Utility functions for consistent date handling across the app
// Ensures dates are treated consistently between form input and display
// All dates are handled in Brasília timezone (UTC-3)

/**
 * Converts a date input value to ISO format using Brasília timezone
 * This prevents timezone shifting issues where selected date differs from saved date
 */
export const dateInputToISO = (dateInput: string): string => {
  // Create date in Brasília timezone (UTC-3)
  const dateBrasilia = new Date(dateInput + 'T00:00:00-03:00');
  return dateBrasilia.toISOString().split('T')[0];
};

/**
 * Formats a date string for display using Brasília timezone
 * Uses the same timezone logic to prevent display discrepancies
 */
export const formatDateForDisplay = (dateString: string): string => {
  // Parse the date in Brasília timezone
  const date = new Date(dateString + 'T00:00:00-03:00');
  return date.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo'
  });
};

/**
 * Converts ISO date string to format suitable for date input field
 */
export const formatDateForInput = (dateString: string): string => {
  return dateString; // ISO format is already compatible with input[type="date"]
};

/**
 * Gets current date in Brasília timezone
 */
export const getCurrentDateBrasilia = (): string => {
  const now = new Date();
  const brasiliaDate = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
  return brasiliaDate.toISOString().split('T')[0];
};

/**
 * Formats date for mobile display using Brasília timezone
 */
export const formatDateForMobile = (dateString: string): { day: number; month: string } => {
  const date = new Date(dateString + 'T00:00:00-03:00');
  return {
    day: date.getDate(),
    month: date.toLocaleDateString('pt-BR', { 
      month: 'short',
      timeZone: 'America/Sao_Paulo'
    })
  };
};