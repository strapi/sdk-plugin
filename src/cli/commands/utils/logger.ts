import { getChalk } from './chalk-loader';

export interface LoggerOptions {
  silent?: boolean;
  debug?: boolean;
  timestamp?: boolean;
}

interface SpinnerHandle {
  text: string;
  succeed: (text?: string) => SpinnerHandle;
  fail: (text?: string) => SpinnerHandle;
  start: (text?: string) => SpinnerHandle;
}

export interface Logger {
  warnings: number;
  errors: number;
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  log: (...args: unknown[]) => void;
  spinner: (text: string) => Promise<SpinnerHandle>;
}

const createLogger = (options: LoggerOptions = {}): Logger => {
  const { silent = false, debug = false, timestamp = true } = options;

  const state = { errors: 0, warning: 0 };

  return {
    get warnings() {
      return state.warning;
    },

    get errors() {
      return state.errors;
    },

    debug(...args) {
      if (silent || !debug) {
        return;
      }

      console.log(
        getChalk().cyan(`[DEBUG]${timestamp ? `\t[${new Date().toISOString()}]` : ''}`),
        ...args
      );
    },

    info(...args) {
      if (silent) {
        return;
      }

      console.info(
        getChalk().blue(`[INFO]${timestamp ? `\t[${new Date().toISOString()}]` : ''}`),
        ...args
      );
    },

    log(...args) {
      if (silent) {
        return;
      }

      console.info(
        getChalk().blue(`${timestamp ? `\t[${new Date().toISOString()}]` : ''}`),
        ...args
      );
    },

    warn(...args) {
      state.warning += 1;

      if (silent) {
        return;
      }

      console.warn(
        getChalk().yellow(`[WARN]${timestamp ? `\t[${new Date().toISOString()}]` : ''}`),
        ...args
      );
    },

    error(...args) {
      state.errors += 1;

      if (silent) {
        return;
      }

      console.error(
        getChalk().red(`[ERROR]${timestamp ? `\t[${new Date().toISOString()}]` : ''}`),
        ...args
      );
    },

    async spinner(text: string): Promise<SpinnerHandle> {
      if (silent) {
        const silentSpinner: SpinnerHandle = {
          text: '',
          succeed() {
            return silentSpinner;
          },
          fail() {
            return silentSpinner;
          },
          start() {
            return silentSpinner;
          },
        };

        return silentSpinner;
      }

      const { loadOra } = await import('./ora-loader');
      const ora = await loadOra();

      return ora(text);
    },
  };
};

export { createLogger };
