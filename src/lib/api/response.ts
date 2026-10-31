import { NextResponse } from "next/server";
import type { ApiErrorDetails } from "./errors";

export const API_VERSION = "v1" as const;

export type ApiSuccessBody<T> = {
  apiVersion: typeof API_VERSION;
  ok: true;
  data: T;
};

export type ApiErrorBody = {
  apiVersion: typeof API_VERSION;
  ok: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetails;
  };
};

export function apiSuccess<T>(
  data: T,
  init?: { status?: number; headers?: HeadersInit },
): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json(
    { apiVersion: API_VERSION, ok: true, data },
    { status: init?.status ?? 200, headers: init?.headers },
  );
}

export function apiError(
  status: number,
  code: string,
  message: string,
  details?: ApiErrorDetails,
  headers?: HeadersInit,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    {
      apiVersion: API_VERSION,
      ok: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status, headers },
  );
}
