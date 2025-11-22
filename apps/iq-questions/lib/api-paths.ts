// API path constants for IQ Questions app
// These include basePath and trailing slashes to work with Next.js basePath and trailingSlash config

export const BASE_PATH = '/iq-questions';

export const API_PATHS = {
  questions: `${BASE_PATH}/api/questions/`,
  question: (id: number | string) => `${BASE_PATH}/api/questions/${id}/`,
} as const;

