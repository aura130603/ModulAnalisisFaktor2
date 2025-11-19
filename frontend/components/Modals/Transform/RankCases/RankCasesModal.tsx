"use client";

import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useVariableStore } from "@/stores/useVariableStore";
import { useDataStore } from "@/stores/useDataStore";
import { Variable } from "@/types/Variable";

interface RankCasesModalProps {
  onClose: () => void;
  containerType?: "dialog" | "sidebar";
}

type TieHandling = "average" | "first" | "random" | "last";
type SortOrder = "ascending" | "descending";

const RankCasesModal: React.FC<RankCasesModalProps> = ({
  onClose,
  containerType = "dialog",
}) => {
  const variables = useVariableStore((state) => state.variables);
  const data = useDataStore((state) => state.data);
  const addVariable = useVariableStore((state) => state.addVariable);
  const updateCells = useDataStore((state) => state.updateCells);

  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [tieHandling, setTieHandling] = useState<TieHandling>("average");
  const [sortOrder, setSortOrder] = useState<SortOrder>("ascending");
  const [rankPrefix, setRankPrefix] = useState("R_");
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleVariable = useCallback((varName: string) => {
    setSelectedVariables((prev) =>
      prev.includes(varName)
        ? prev.filter((v) => v !== varName)
        : [...prev, varName]
    );
  }, []);

  const calculateRanks = (values: (string | number | null)[]): number[] => {
    // Create array of {index, value, isNull} for sorting
    const indexed = values.map((val, idx) => ({
      index: idx,
      value:
        val === null || val === undefined || val === ""
          ? NaN
          : Number(val),
      original: val,
    }));

    // Separate valid and invalid values
    const valid = indexed.filter((x) => !isNaN(x.value));
    const invalid = indexed.filter((x) => isNaN(x.value));

    if (valid.length === 0) {
      // All values are null/invalid
      return values.map(() => NaN);
    }

    // Sort by value
    const sorted =
      sortOrder === "ascending"
        ? [...valid].sort((a, b) => a.value - b.value)
        : [...valid].sort((a, b) => b.value - a.value);

    // Assign ranks
    const ranks = new Array(sorted.length);

    for (let i = 0; i < sorted.length; ) {
      const current = sorted[i].value;

      // Find all elements with the same value
      let j = i;
      while (j < sorted.length && sorted[j].value === current) {
        j++;
      }

      const ties = j - i;
      const startRank = i + 1;
      const endRank = j;
      let assignedRank: number;

      if (tieHandling === "average") {
        assignedRank = (startRank + endRank) / 2;
      } else if (tieHandling === "first") {
        assignedRank = startRank;
      } else if (tieHandling === "last") {
        assignedRank = endRank;
      } else if (tieHandling === "random") {
        assignedRank = startRank + Math.floor(Math.random() * ties);
      } else {
        assignedRank = (startRank + endRank) / 2;
      }

      for (let k = i; k < j; k++) {
        ranks[k] = assignedRank;
      }

      i = j;
    }

    // Build result array
    const result = new Array(values.length);
    let rankIdx = 0;

    for (const item of sorted) {
      result[item.index] = ranks[rankIdx++];
    }

    for (const item of invalid) {
      result[item.index] = NaN;
    }

    return result;
  };

  const handleApply = async () => {
    if (selectedVariables.length === 0) {
      toast.error("Please select at least one variable to rank");
      return;
    }

    setIsProcessing(true);

    try {
      const maxColumnIndex = Math.max(
        ...variables.map((v) => v.columnIndex),
        -1
      );

      // For each selected variable, calculate ranks and create a new variable
      for (const varName of selectedVariables) {
        const variable = variables.find((v) => v.name === varName);
        if (!variable) continue;

        // Get column data
        const columnData = data.map((row) => row[variable.columnIndex]);

        // Calculate ranks
        const ranks = calculateRanks(columnData);

        // Create new variable for ranks
        const newVarName = `${rankPrefix}${varName}`;
        const newColumnIndex = maxColumnIndex + selectedVariables.indexOf(varName) + 1;

        // Add the new variable to the store
        addVariable({
          name: newVarName,
          columnIndex: newColumnIndex,
          type: "NUMERIC",
          width: 8,
          decimals: 2,
          label: `Rank of ${varName}`,
          values: "",
          missing: "",
          alignment: "right",
          measure: "ordinal",
        });

        // Update the data store with the rank values
        const updates = ranks.map((rank, rowIndex) => ({
          row: rowIndex,
          col: newColumnIndex,
          value: isNaN(rank) ? "" : rank,
        }));

        await updateCells(updates);
      }

      toast.success(
        `Created ${selectedVariables.length} rank variable(s)`
      );
      onClose();
    } catch (error) {
      console.error("Error ranking cases:", error);
      toast.error("Failed to rank cases");
    } finally {
      setIsProcessing(false);
    }
  };

  const numericVariables = variables.filter(
    (v) => v.type === "NUMERIC" || v.type === "COMMA" || v.type === "DOT"
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Rank Cases</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Variables Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Select Variables to Rank
            </Label>
            <ScrollArea className="border rounded-md p-4 h-48">
              <div className="space-y-2">
                {numericVariables.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No numeric variables available
                  </p>
                ) : (
                  numericVariables.map((variable) => (
                    <div
                      key={variable.name}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`var-${variable.name}`}
                        checked={selectedVariables.includes(variable.name)}
                        onCheckedChange={() => toggleVariable(variable.name)}
                      />
                      <Label
                        htmlFor={`var-${variable.name}`}
                        className="font-normal cursor-pointer"
                      >
                        {variable.name}
                        {variable.label && ` (${variable.label})`}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Tie Handling */}
          <div className="space-y-2">
            <Label htmlFor="tie-handling">Handling of Ties</Label>
            <Select value={tieHandling} onValueChange={(v) => setTieHandling(v as TieHandling)}>
              <SelectTrigger id="tie-handling">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="average">Average</SelectItem>
                <SelectItem value="first">First</SelectItem>
                <SelectItem value="last">Last</SelectItem>
                <SelectItem value="random">Random</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {tieHandling === "average" &&
                "When values are equal, assign the average of their ranks"}
              {tieHandling === "first" &&
                "When values are equal, assign the lowest rank"}
              {tieHandling === "last" &&
                "When values are equal, assign the highest rank"}
              {tieHandling === "random" &&
                "When values are equal, randomly assign ranks within the group"}
            </p>
          </div>

          {/* Sort Order */}
          <div className="space-y-2">
            <Label htmlFor="sort-order">Sort Order</Label>
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
              <SelectTrigger id="sort-order">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ascending">Ascending (1 = smallest)</SelectItem>
                <SelectItem value="descending">Descending (1 = largest)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rank Variable Names */}
          <div className="space-y-2">
            <Label htmlFor="rank-prefix">Rank Variable Name Prefix</Label>
            <Input
              id="rank-prefix"
              value={rankPrefix}
              onChange={(e) => setRankPrefix(e.target.value)}
              placeholder="R_"
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              New variables will be named: {rankPrefix}
              {selectedVariables[0] || "VARIABLE"}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={isProcessing}>
            {isProcessing ? "Processing..." : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RankCasesModal;
