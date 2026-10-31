export type ApiErrorDetails = {
  fieldErrors?: Record<string, string>;
  missingScopes?: string[];
  [key: string]: unknown;
};

export class ApiHttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ApiErrorDetails;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: ApiErrorDetails,
  ) {
    super(message);
    this.name = "ApiHttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
