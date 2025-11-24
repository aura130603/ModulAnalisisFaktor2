import { getSlicedData, getVarDefs } from "@/hooks/useVariable";
import { FactorAnalysisType } from "@/components/Modals/Analyze/dimension-reduction/factor/types/factor-worker";
import { transformFactorAnalysisResult } from "@/components/Modals/Analyze/dimension-reduction/factor/services/factor-analysis-formatter";
import { resultFactorAnalysis } from "@/components/Modals/Analyze/dimension-reduction/factor/services/factor-analysis-output";
import init, {
    FactorAnalysis,
} from "@/components/Modals/Analyze/dimension-reduction/factor/rust/pkg/wasm";

/**
 * Main entry point for factor analysis using WASM
 * Orchestrates data preparation and WASM module computation
 */
export async function analyzeFactor({
    configData,
    dataVariables,
    variables,
}: FactorAnalysisType) {
    try {
        const targetVariables = configData.main.TargetVar || [];

        if (!targetVariables || targetVariables.length === 0) {
            throw new Error("No variables selected for factor analysis");
        }

        if (!dataVariables || dataVariables.length === 0) {
            throw new Error("No data available for factor analysis");
        }

        // Initialize WASM module
        await init();

        // Get sliced data for target variables
        const slicedDataForTarget = getSlicedData({
            dataVariables: dataVariables,
            variables: variables,
            selectedVariables: targetVariables,
        });

        // Get variable definitions for target variables
        const varDefsForTarget = getVarDefs(variables, targetVariables);

        // Get sliced data for value target variables (if any)
        const valueTargetVariables = configData.values?.ValueTargetVar || [];
        const slicedDataForValueTarget = getSlicedData({
            dataVariables: dataVariables,
            variables: variables,
            selectedVariables: valueTargetVariables.length > 0 ? valueTargetVariables : [],
        });

        // Get variable definitions for value target variables
        const varDefsForValueTarget = getVarDefs(variables, valueTargetVariables.length > 0 ? valueTargetVariables : []);

        // Log data structure for debugging
        if (typeof window !== 'undefined') {
            (window as any).lastFactorAnalysisData = {
                targetVariables,
                valueTargetVariables,
                slicedDataForTarget,
                slicedDataForValueTarget,
                varDefsForTarget,
                varDefsForValueTarget,
            };
        }

        // Create FactorAnalysis instance and run analysis
        const factorAnalysis = new FactorAnalysis(
            slicedDataForTarget,
            slicedDataForValueTarget,
            varDefsForTarget,
            varDefsForValueTarget,
            configData
        );

        // Get formatted results from WASM
        const results = factorAnalysis.get_formatted_results();
        console.log("Factor analysis results from WASM:", results);

        // Get error messages if any
        const errorsString = factorAnalysis.get_all_errors();
        console.log("Factor analysis errors:", errorsString);

        let errors: string[] = [];
        if (errorsString) {
            errors = errorsString
                .split("\n")
                .filter((line: string) => line.trim() !== "");
        }

        // Format results for display
        const formattedResults = transformFactorAnalysisResult(results ?? {});
        console.log("Formatted Factor analysis results:", formattedResults);

        // Save to result store
        await resultFactorAnalysis({
            formattedResult: formattedResults ?? [],
        });
    } catch (error) {
        console.error("Factor analysis error:", error);
        throw error;
    }
}
