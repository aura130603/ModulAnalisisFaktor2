// // INI KODE (titik kunci) yang buat data disiapkan dan dikirim ke Web Worker.

// import {getSlicedData, getVarDefs} from "@/hooks/useVariable";
// import {FactorAnalysisType} from "@/components/Modals/Analyze/dimension-reduction/factor/types/factor-worker";
// import {transformFactorAnalysisResult} from "@/components/Modals/Analyze/dimension-reduction/factor/services/factor-analysis-formatter";
// import {resultFactorAnalysis} from "@/components/Modals/Analyze/dimension-reduction/factor/services/factor-analysis-output";

// /**
//  * Sends complete factor analysis task to web worker
//  * All computations are offloaded to worker thread for better performance
//  */
// // Send all computations to worker

// function performAnalysisWithWorker(
//     data: number[][],
//     variables: string[],
//     configData: any
// ): Promise<any> {
//     return new Promise((resolve, reject) => {
//         const worker = new Worker('/workers/FactorAnalysis/factorAnalysis.worker.js');

//         const timeout = setTimeout(() => {
//             worker.terminate();
//             reject(new Error('Factor analysis computation timed out'));
//         }, 60000); // 60 second timeout for complex analyses

//         worker.onmessage = (event) => {
//             clearTimeout(timeout);
//             const { type, data: resultData, message } = event.data;

//             if (type === 'factorAnalysisCompleted') {
//                 worker.terminate();
//                 resolve(resultData);
//             } else if (type === 'error') {
//                 worker.terminate();
//                 reject(new Error(message));
//             }
//         };

//         worker.onerror = (error) => {
//             clearTimeout(timeout);
//             worker.terminate();
//             reject(error);
//         };

//         worker.postMessage({
//             type: 'performCompleteFactorAnalysis',
//             data: { 
//                 data, 
//                 variables,
//                 configData
//             }
//         });
//     });
// }

// /**
//  * Main entry point for factor analysis
//  * Orchestrates data preparation and worker communication
//  */
// export async function analyzeFactor({
//     configData,
//     dataVariables,
//     variables,
// }: FactorAnalysisType) {
//     try {
//         const targetVariables = configData.main.TargetVar || [];

//         if (!targetVariables || targetVariables.length === 0) {
//             console.error("No variables selected for factor analysis");
//             return;
//         }

//         // Get raw data for selected variables
//         const slicedDataRaw = getSlicedData({
//             dataVariables: dataVariables,
//             variables: variables,
//             selectedVariables: targetVariables,
//         });
       
//         // Convert to numeric 2D array (variables × samples)
//         const slicedDataForTarget = slicedDataRaw.map((varData, varIndex) => {
//             return varData.map((row: any) => {
//                 const varName = targetVariables[varIndex];
//                 const value = row[varName];
//                 return typeof value === 'number' 
//                     ? value 
//                     : (value === null ? NaN : parseFloat(String(value)));
//             });
//         });
        
//         // Send all computations to worker
//         // Send all computations to worker

//         // AUTO-DOWNLOAD DEBUG FILE OF DATA SENT TO WORKER
//         // (function downloadDebug() {
//         //     const debugData = {
//         //         variables: targetVariables,
//         //         shape: {
//         //             variables: slicedDataForTarget.length,
//         //             samples: slicedDataForTarget[0]?.length || 0,
//         //         },
//         //         data: slicedDataForTarget
//         //     };

//         //     const blob = new Blob(
//         //         [JSON.stringify(debugData, null, 2)],
//         //         { type: "application/json" }
//         //     );

//         //     const url = URL.createObjectURL(blob);
//         //     const a = document.createElement("a");
//         //     a.href = url;
//         //     a.download = "FA_debug_data_sent_to_worker.json";
//         //     a.click();
//         // })();

//         const results = await performAnalysisWithWorker(
//             slicedDataForTarget,
//             targetVariables,
//             configData
//         );

//         // Format results for display
//         const formattedResults = transformFactorAnalysisResult(results);
//         console.log("Factor analysis results:", formattedResults);

//         // Save to result store
//         await resultFactorAnalysis({
//             formattedResult: formattedResults ?? [],
//         });
//     } catch (error) {
//         console.error("Factor analysis error:", error);
//         throw error;
//     }
// }




import {getSlicedData, getVarDefs} from "@/hooks/useVariable";
import {FactorAnalysisType} from "@/components/Modals/Analyze/dimension-reduction/factor/types/factor-worker";
import {transformFactorAnalysisResult} from "@/components/Modals/Analyze/dimension-reduction/factor/services/factor-analysis-formatter";
import {resultFactorAnalysis} from "@/components/Modals/Analyze/dimension-reduction/factor/services/factor-analysis-output";

/**
 * Sends complete factor analysis task to web worker
 * All computations are offloaded to worker thread for better performance
 */
// Send all computations to worker

function performAnalysisWithWorker(
    data: number[][],
    variables: string[],
    configData: any
): Promise<any> {
    return new Promise((resolve, reject) => {
        const worker = new Worker('/workers/FactorAnalysis/factorAnalysis.worker.js');

        const timeout = setTimeout(() => {
            worker.terminate();
            reject(new Error('Factor analysis computation timed out'));
        }, 60000); // 60 second timeout for complex analyses

        worker.onmessage = (event) => {
            clearTimeout(timeout);
            const { type, data: resultData, message } = event.data;

            if (type === 'factorAnalysisCompleted') {
                worker.terminate();
                resolve(resultData);
            } else if (type === 'error') {
                worker.terminate();
                reject(new Error(message));
            }
        };

        worker.onerror = (error) => {
            clearTimeout(timeout);
            worker.terminate();
            reject(error);
        };

        worker.postMessage({
            type: 'performCompleteFactorAnalysis',
            data: { 
                data, 
                variables,
                configData
            }
        });
    });
}

/**
 * Main entry point for factor analysis
 * Orchestrates data preparation and worker communication
 */
export async function analyzeFactor({
    configData,
    dataVariables, // Ini diasumsikan data mentah penuh (Array<Array<string | number>>)
    variables,
}: FactorAnalysisType) {
    try {
        const targetVariables = configData.main.TargetVar || [];

        if (!targetVariables || targetVariables.length === 0) {
            console.error("No variables selected for factor analysis");
            return;
        }

        // Build map of variable names to their column indices
        const columnIndexMap = new Map<string, number>();
        variables.forEach(v => {
            if (targetVariables.includes(v.name)) {
                columnIndexMap.set(v.name, v.columnIndex);
            }
        });

        // Initialize array to store data in Variables x Samples format
        // Format: [ [VAR1_sample1, VAR1_sample2, ...], [VAR2_sample1, VAR2_sample2, ...] ]
        const slicedDataForTarget: number[][] = targetVariables.map(() => []);

        // Iterate through all data rows and extract values for target variables
        // This ensures we capture all samples and proper data shape
        dataVariables.forEach((row) => {
            targetVariables.forEach((varName, varIndex) => {
                const colIndex = columnIndexMap.get(varName);

                if (colIndex !== undefined && colIndex < row.length) {
                    const rawValue = row[colIndex];

                    // Convert value to number, handling various formats
                    let numericValue: number;

                    if (rawValue === null || rawValue === undefined || rawValue === "") {
                        numericValue = NaN; // Null/empty becomes NaN
                    } else if (typeof rawValue === 'number') {
                        numericValue = rawValue;
                    } else {
                        // Parse string values, handling comma as decimal separator
                        const stringValue = String(rawValue);
                        numericValue = parseFloat(stringValue.replace(",", "."));
                    }

                    // Push value even if NaN - the worker will handle missing values during calculation
                    slicedDataForTarget[varIndex].push(numericValue);
                }
            });
        });

        // Debug log (can be uncommented to verify data structure)
        // console.log("Data sent to factor analysis worker:", {
        //     variables: targetVariables,
        //     shape: {
        //         variables: slicedDataForTarget.length,
        //         samples: slicedDataForTarget[0]?.length || 0,
        //     },
        //     data: slicedDataForTarget
        // });

        const results = await performAnalysisWithWorker(
            slicedDataForTarget, // Menggunakan data yang sudah diformat dengan sampel > 1
            targetVariables,
            configData
        );

        // Format results for display
        const formattedResults = transformFactorAnalysisResult(results);
        console.log("Factor analysis results:", formattedResults);

        // Save to result store
        await resultFactorAnalysis({
            formattedResult: formattedResults ?? [],
        });
    } catch (error) {
        console.error("Factor analysis error:", error);
        throw error;
    }
}
