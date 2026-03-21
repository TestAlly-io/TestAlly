import { describe, expect, it, vi, beforeAll } from "vitest";
import type { NextFunction, Request, Response } from "express";

process.env.MAX_INPUT_SIZE_KB = "50";

let validateAnalyzeInput: (
  req: Request,
  res: Response,
  next: NextFunction
) => void;

beforeAll(async () => {
  ({ validateAnalyzeInput } = await import("../validate-input.js"));
});

const mockReqResNext = (body: unknown) => {
  const req = {
    method: "POST",
    body,
  } as unknown as Request;

  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn();

  const next = vi.fn();

  return { req, res: res as Response, next };
};

describe("validateAnalyzeInput", () => {
  it("passes valid input (code + language) -> next() called", () => {
    const { req, res, next } = mockReqResNext({
      code: "const x = 1;",
      language: "tsx",
    });

    validateAnalyzeInput(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("rejects missing code -> 400, next not called", () => {
    const { req, res, next } = mockReqResNext({
      language: "html",
    });

    validateAnalyzeInput(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "VALIDATION_ERROR",
        statusCode: 400,
        details: expect.any(Array),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects empty/whitespace-only code -> 400", () => {
    const { req, res, next } = mockReqResNext({
      code: "   ",
      language: "html",
    });

    validateAnalyzeInput(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        error: "VALIDATION_ERROR",
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects missing language -> 400", () => {
    const { req, res, next } = mockReqResNext({
      code: "const x = 1;",
    });

    validateAnalyzeInput(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        error: "VALIDATION_ERROR",
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects unsupported language (e.g. "python") -> 400', () => {
    const { req, res, next } = mockReqResNext({
      code: "print('hi')",
      language: "python",
    });

    validateAnalyzeInput(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        error: "VALIDATION_ERROR",
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects code over 50KB -> 413, next not called", () => {
    const tooLargeCode = "a".repeat(50 * 1024 + 1);
    const { req, res, next } = mockReqResNext({
      code: tooLargeCode,
      language: "html",
    });

    validateAnalyzeInput(req, res, next);

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "PAYLOAD_TOO_LARGE",
        statusCode: 413,
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts valid optional fields -> next() called", () => {
    const { req, res, next } = mockReqResNext({
      code: "const x = 1;",
      language: "html",
      description: "A description",
      css: ".btn{ color: red; }",
      js: "console.log('ok');",
    });

    validateAnalyzeInput(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

