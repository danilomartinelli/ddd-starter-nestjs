import {
  ArgumentInvalidException,
  ArgumentNotProvidedException,
  ArgumentOutOfRangeException,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from "../exceptions";
import {
  ARGUMENT_INVALID,
  ARGUMENT_NOT_PROVIDED,
  ARGUMENT_OUT_OF_RANGE,
  CONFLICT,
  NOT_FOUND,
  INTERNAL_SERVER_ERROR,
} from "../exceptions/exception.codes";

describe("Exception classes", () => {
  describe("ArgumentInvalidException", () => {
    it("has correct code", () => {
      const error = new ArgumentInvalidException("invalid arg");
      expect(error.code).toBe(ARGUMENT_INVALID);
    });

    it("preserves message", () => {
      const error = new ArgumentInvalidException("test message");
      expect(error.message).toBe("test message");
    });

    it("is an instance of Error", () => {
      const error = new ArgumentInvalidException("test");
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("ArgumentNotProvidedException", () => {
    it("has correct code", () => {
      const error = new ArgumentNotProvidedException("not provided");
      expect(error.code).toBe(ARGUMENT_NOT_PROVIDED);
    });
  });

  describe("ArgumentOutOfRangeException", () => {
    it("has correct code", () => {
      const error = new ArgumentOutOfRangeException("out of range");
      expect(error.code).toBe(ARGUMENT_OUT_OF_RANGE);
    });
  });

  describe("ConflictException", () => {
    it("has correct code", () => {
      const error = new ConflictException("conflict");
      expect(error.code).toBe(CONFLICT);
    });

    it("preserves cause", () => {
      const cause = new Error("original");
      const error = new ConflictException("conflict", cause);
      expect(error.cause).toBe(cause);
    });
  });

  describe("NotFoundException", () => {
    it("has correct code", () => {
      const error = new NotFoundException();
      expect(error.code).toBe(NOT_FOUND);
    });

    it("uses default message when none provided", () => {
      const error = new NotFoundException();
      expect(error.message).toBe("Not found");
    });

    it("accepts custom message", () => {
      const error = new NotFoundException("User not found");
      expect(error.message).toBe("User not found");
    });
  });

  describe("InternalServerErrorException", () => {
    it("has correct code", () => {
      const error = new InternalServerErrorException();
      expect(error.code).toBe(INTERNAL_SERVER_ERROR);
    });

    it("uses default message when none provided", () => {
      const error = new InternalServerErrorException();
      expect(error.message).toBe("Internal server error");
    });
  });

  describe("ExceptionBase (tested via concrete class)", () => {
    it("has correlationId from request context", () => {
      const error = new NotFoundException();
      expect(error.correlationId).toBe("test-request-id");
    });

    it("serializes to JSON correctly", () => {
      const cause = new Error("root cause");
      const error = new ConflictException("conflict", cause, {
        field: "email",
      });
      const json = error.toJSON();

      expect(json).toEqual({
        message: "conflict",
        code: CONFLICT,
        correlationId: "test-request-id",
        stack: expect.any(String),
        cause: expect.any(String),
        metadata: { field: "email" },
      });
    });

    it("preserves metadata", () => {
      const error = new ConflictException("conflict", undefined, {
        entity: "User",
      });
      expect(error.metadata).toEqual({ entity: "User" });
    });
  });
});
