const createSpinner = () => {
  const spinner = {
    text: '',
    start() {
      return spinner;
    },
    succeed() {
      return spinner;
    },
    fail() {
      return spinner;
    },
    stop() {
      return spinner;
    },
  };

  return spinner;
};

export default function ora() {
  return createSpinner();
}

export async function oraPromise<T>(
  action: PromiseLike<T> | ((spinner: ReturnType<typeof createSpinner>) => PromiseLike<T>)
): Promise<T> {
  if (typeof action === 'function') {
    return action(createSpinner());
  }

  return action;
}
