import { describe, it, expect } from "vitest";
import {
  DateAlignmentError,
  InitialValueZeroError,
  MixedValuetypesError,
  NoWeightsError,
  LabelsNotUniqueError,
  IncorrectArgumentComboError,
  ResampleDataLossError,
} from "../src/types";

describe("Error classes", () => {
  it("DateAlignmentError has correct name and message", () => {
    const err = new DateAlignmentError("test message");
    expect(err.name).toBe("DateAlignmentError");
    expect(err.message).toBe("test message");
    expect(err).toBeInstanceOf(Error);
  });

  it("InitialValueZeroError has correct name and message", () => {
    const err = new InitialValueZeroError("test message");
    expect(err.name).toBe("InitialValueZeroError");
    expect(err.message).toBe("test message");
    expect(err).toBeInstanceOf(Error);
  });

  it("MixedValuetypesError has correct name and message", () => {
    const err = new MixedValuetypesError("test message");
    expect(err.name).toBe("MixedValuetypesError");
    expect(err.message).toBe("test message");
    expect(err).toBeInstanceOf(Error);
  });

  it("NoWeightsError has correct name and message", () => {
    const err = new NoWeightsError("test message");
    expect(err.name).toBe("NoWeightsError");
    expect(err.message).toBe("test message");
    expect(err).toBeInstanceOf(Error);
  });

  it("LabelsNotUniqueError has correct name and message", () => {
    const err = new LabelsNotUniqueError("test message");
    expect(err.name).toBe("LabelsNotUniqueError");
    expect(err.message).toBe("test message");
    expect(err).toBeInstanceOf(Error);
  });

  it("IncorrectArgumentComboError has correct name and message", () => {
    const err = new IncorrectArgumentComboError("test message");
    expect(err.name).toBe("IncorrectArgumentComboError");
    expect(err.message).toBe("test message");
    expect(err).toBeInstanceOf(Error);
  });

  it("ResampleDataLossError has correct name and message", () => {
    const err = new ResampleDataLossError("test message");
    expect(err.name).toBe("ResampleDataLossError");
    expect(err.message).toBe("test message");
    expect(err).toBeInstanceOf(Error);
  });
});
