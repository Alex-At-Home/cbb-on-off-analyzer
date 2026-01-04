import { buildOptimizedConfig } from "../ColumnConfigModal";

describe("buildOptimizedConfig", () => {
  const originalTableFieldKeys = ["A", "B", "C", "D"];

  describe("when columns match original order exactly", () => {
    it("should return empty newCol when all columns enabled in same order", () => {
      // A, B, C, D (same as original)
      const currentColumns = ["A", "B", "C", "D"];
      const disabledColumns: string[] = [];

      const result = buildOptimizedConfig(
        currentColumns,
        disabledColumns,
        originalTableFieldKeys
      );

      expect(result).toEqual({
        newCol: [],
      });
    });

    it("should return empty newCol with disabledCols when some columns are disabled", () => {
      // A, B, (disabled C), D
      const currentColumns = ["A", "B", "C", "D"];
      const disabledColumns = ["C"];

      const result = buildOptimizedConfig(
        currentColumns,
        disabledColumns,
        originalTableFieldKeys
      );

      expect(result).toEqual({
        newCol: [],
        disabledCols: ["C"],
      });
    });

    it("should return empty newCol with multiple disabled columns", () => {
      // (disabled A), B, (disabled C), D
      const currentColumns = ["A", "B", "C", "D"];
      const disabledColumns = ["A", "C"];

      const result = buildOptimizedConfig(
        currentColumns,
        disabledColumns,
        originalTableFieldKeys
      );

      expect(result).toEqual({
        newCol: [],
        disabledCols: ["A", "C"],
      });
    });
  });

  describe("when columns have been reordered", () => {
    it("should return full newCol when columns are reordered", () => {
      // B, A, C, D (reordered)
      const currentColumns = ["B", "A", "C", "D"];
      const disabledColumns: string[] = [];

      const result = buildOptimizedConfig(
        currentColumns,
        disabledColumns,
        originalTableFieldKeys
      );

      expect(result).toEqual({
        newCol: ["B", "A", "C", "D"],
      });
    });

    it("should return full newCol with disabledCols when reordered with disabled", () => {
      // B, A, (disabled C), D (reordered with disabled)
      const currentColumns = ["B", "A", "C", "D"];
      const disabledColumns = ["C"];

      const result = buildOptimizedConfig(
        currentColumns,
        disabledColumns,
        originalTableFieldKeys
      );

      expect(result).toEqual({
        newCol: ["B", "A", "C", "D"],
        disabledCols: ["C"],
      });
    });
  });

  describe("when extra columns have been added", () => {
    it("should return full newCol when extra column added at beginning", () => {
      // E, A, B, C, D (extra column E from external set)
      const currentColumns = ["ExtraSet.E", "A", "B", "C", "D"];
      const disabledColumns: string[] = [];

      const result = buildOptimizedConfig(
        currentColumns,
        disabledColumns,
        originalTableFieldKeys
      );

      expect(result).toEqual({
        newCol: ["ExtraSet.E", "A", "B", "C", "D"],
      });
    });

    it("should return full newCol when extra column added at end", () => {
      // A, B, C, D, E (extra column E from external set)
      const currentColumns = ["A", "B", "C", "D", "ExtraSet.E"];
      const disabledColumns: string[] = [];

      const result = buildOptimizedConfig(
        currentColumns,
        disabledColumns,
        originalTableFieldKeys
      );

      expect(result).toEqual({
        newCol: ["A", "B", "C", "D", "ExtraSet.E"],
      });
    });

    it("should return full newCol with disabledCols when extra column added with disabled", () => {
      // A, B, (disabled C), D, E
      const currentColumns = ["A", "B", "C", "D", "ExtraSet.E"];
      const disabledColumns = ["C"];

      const result = buildOptimizedConfig(
        currentColumns,
        disabledColumns,
        originalTableFieldKeys
      );

      expect(result).toEqual({
        newCol: ["A", "B", "C", "D", "ExtraSet.E"],
        disabledCols: ["C"],
      });
    });

    it("should return full newCol when extra column added in middle", () => {
      // A, B, E, C, D (extra column E inserted in middle)
      const currentColumns = ["A", "B", "ExtraSet.E", "C", "D"];
      const disabledColumns: string[] = [];

      const result = buildOptimizedConfig(
        currentColumns,
        disabledColumns,
        originalTableFieldKeys
      );

      expect(result).toEqual({
        newCol: ["A", "B", "ExtraSet.E", "C", "D"],
      });
    });
  });

  describe("edge cases", () => {
    it("should handle empty columns", () => {
      const currentColumns: string[] = [];
      const disabledColumns: string[] = [];

      const result = buildOptimizedConfig(currentColumns, disabledColumns, []);

      expect(result).toEqual({
        newCol: [],
      });
    });

    it("should handle all columns disabled", () => {
      // All disabled: (disabled A), (disabled B), (disabled C), (disabled D)
      const currentColumns = ["A", "B", "C", "D"];
      const disabledColumns = ["A", "B", "C", "D"];

      const result = buildOptimizedConfig(
        currentColumns,
        disabledColumns,
        originalTableFieldKeys
      );

      // All disabled but columns still in original order, so return empty newCol
      expect(result).toEqual({
        newCol: [],
        disabledCols: ["A", "B", "C", "D"],
      });
    });

    it("should handle columns removed (fewer columns than original)", () => {
      // Only A, B (C and D removed)
      const currentColumns = ["A", "B"];
      const disabledColumns: string[] = [];

      const result = buildOptimizedConfig(
        currentColumns,
        disabledColumns,
        originalTableFieldKeys
      );

      // Fewer enabled columns than original, so full newCol
      expect(result).toEqual({
        newCol: ["A", "B"],
      });
    });

    it("should handle single column table", () => {
      const currentColumns = ["A"];
      const disabledColumns: string[] = [];
      const singleColumnOriginal = ["A"];

      const result = buildOptimizedConfig(
        currentColumns,
        disabledColumns,
        singleColumnOriginal
      );

      expect(result).toEqual({
        newCol: [],
      });
    });
  });
});

