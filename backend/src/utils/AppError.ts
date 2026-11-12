export class AppError extends Error {
  status: number;
  details?: unknown;
  expose: boolean;

  constructor(message: string, status = 400, details?: unknown, expose = true) {
    super(message);
    this.status = status;
    this.details = details;
    this.expose = expose;
  }
}
