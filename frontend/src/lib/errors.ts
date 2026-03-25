import { AxiosError } from "axios";

export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    return err.response?.data?.error ?? fallback;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}
