export const logger = {
  info: (tag: string, message: string, meta?: unknown) => {
    if (__DEV__) {
      console.log(`[${tag}] ${message}`, meta ?? '');
    }
  },
  warn: (tag: string, message: string, meta?: unknown) => {
    console.warn(`[${tag}] ${message}`, meta ?? '');
  },
  error: (tag: string, message: string, error?: unknown) => {
    console.error(`[${tag}] ${message}`, error ?? '');
  }
};
