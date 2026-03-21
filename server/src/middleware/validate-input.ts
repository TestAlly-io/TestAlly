import type { NextFunction, Request, Response } from "express";
import type { AnalyzeRequest } from "../types/api.js";

type FieldDetail = { field: string; message: string };

const allowedLanguages = new Set(["html", "jsx", "tsx", "vue", "svelte"]);

const maxInputSizeKb = (() => {
  const raw = process.env.MAX_INPUT_SIZE_KB;
  if (!raw) return 50;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 50;
})();

const maxInputSizeBytes = maxInputSizeKb * 1024;

type ValidationResult =
  | { kind: "too_large"; field: string; message: string }
  | { kind: "invalid"; field: string; message: string }
  | null;

// Private helper to keep per-field validation logic consistent.
const validateField = (
  field: keyof AnalyzeRequest,
  value: unknown,
  opts: {
    required: boolean;
    validate: (value: string) => string | null;
  }
): ValidationResult => {
  if (value === undefined) {
    return opts.required
      ? { kind: "invalid", field: String(field), message: "is required." }
      : null;
  }

  if (typeof value !== "string") {
    return {
      kind: "invalid",
      field: String(field),
      message: "must be a string.",
    };
  }

  const bytes = Buffer.byteLength(value, "utf8");
  if (bytes > maxInputSizeBytes) {
    return {
      kind: "too_large",
      field: String(field),
      message: `must not exceed ${maxInputSizeKb}KB.`,
    };
  }

  const validationError = opts.validate(value);
  if (validationError) {
    return {
      kind: "invalid",
      field: String(field),
      message: validationError,
    };
  }

  return null;
};

export const validateAnalyzeInput = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.method !== "POST") return next();

  const body = req.body as Partial<AnalyzeRequest>;

  const results: ValidationResult[] = [
    validateField("code", body.code, {
      required: true,
      validate: (v) => (v.trim().length === 0 ? "must not be empty." : null),
    }),
    validateField("language", body.language, {
      required: true,
      validate: (v) =>
        allowedLanguages.has(v) ? null : "must be one of html, jsx, tsx, vue, svelte.",
    }),
    validateField("description", body.description, {
      required: false,
      validate: () => null, // Type and size checks handled by validateField.
    }),
    validateField("css", body.css, {
      required: false,
      validate: () => null,
    }),
    validateField("js", body.js, {
      required: false,
      validate: () => null,
    }),
  ];

  const validations = results.filter(
    (r): r is Exclude<ValidationResult, null> => r !== null
  );

  const tooLarge = validations.find((v) => v.kind === "too_large");
  if (tooLarge) {
    res.status(413).json({
      error: "PAYLOAD_TOO_LARGE",
      message: `Field "${tooLarge.field}" ${tooLarge.message}`,
      statusCode: 413,
    });
    return;
  }

  const details: FieldDetail[] = validations
    .filter((v) => v.kind === "invalid")
    .map((v) => ({ field: v.field, message: v.message }));

  if (details.length > 0) {
    res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Invalid request body.",
      details,
      statusCode: 400,
    });
    return;
  }

  next();
};

