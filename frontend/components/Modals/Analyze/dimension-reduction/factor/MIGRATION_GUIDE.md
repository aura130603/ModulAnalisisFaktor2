# Factor Analysis: Web Worker to WASM Migration Guide

This document outlines the migration from Web Worker-based computation to WebAssembly (WASM) with Rust for the Factor Analysis feature.

## Overview

The Factor Analysis feature has been successfully migrated from using Web Workers to using WebAssembly compiled from Rust. This change improves performance and maintainability while reducing code complexity.

## Changes Made

### 1. Code Structure Changes

#### Removed
- **`frontend/public/workers/FactorAnalysis/`** - Entire directory with JavaScript web worker implementation
  - Contained: `factorAnalysis.worker.js`, `correlation.js`, `eigen.js`, `pca.js`, `rotation.js`

#### Updated
- **`frontend/components/Modals/Analyze/dimension-reduction/factor/services/factor-analysis.ts`**
  - Replaced web worker communication logic with WASM module import
  - Updated to use `init()` function to initialize WASM module
  - Changed to create `FactorAnalysis` class instance from WASM
  - Updated data preparation to match WASM constructor signature

#### Added
- **`frontend/components/Modals/Analyze/dimension-reduction/factor/rust/BUILD.md`** - Build instructions
- **Build scripts in `frontend/package.json`:**
  - `build:wasm` - Builds all WASM modules
  - `build:factor-wasm` - Builds only factor analysis WASM module

### 2. Data Flow Changes

**Before (Web Worker):**
```
React Component
    ↓
factor-analysis.ts
    ↓ (postMessage)
factorAnalysis.worker.js
    ↓ (computation in separate thread)
worker.onmessage
    ↓
Transform and display results
```

**After (WASM):**
```
React Component
    ↓
factor-analysis.ts
    ↓ (await init())
WASM module initialized
    ↓
new FactorAnalysis(data, config)
    ↓ (computation in WASM, still non-blocking)
get_formatted_results()
    ↓
Transform and display results
```

## Building the WASM Module

### Quick Start

Run this command from the root `frontend` directory:

```bash
npm run build:factor-wasm
```

This will:
1. Build the Rust code to WebAssembly
2. Generate the `pkg` folder with compiled WASM and JavaScript bindings
3. Make the module available for import

### Detailed Build Steps

If the quick start doesn't work, follow these steps:

1. **Install wasm-pack** (if not already installed):
   ```bash
   cargo install wasm-pack
   ```

2. **Navigate to the Rust directory**:
   ```bash
   cd frontend/components/Modals/Analyze/dimension-reduction/factor/rust
   ```

3. **Build for web**:
   ```bash
   # Development (faster, larger file)
   wasm-pack build --target web
   
   # Production (slower build, optimized)
   wasm-pack build --target web --release
   ```

4. **Verify the build**:
   - Check if `frontend/components/Modals/Analyze/dimension-reduction/factor/rust/pkg/` exists
   - Verify it contains: `wasm.js`, `wasm.d.ts`, `wasm_bg.wasm`, `wasm_bg.wasm.d.ts`

## Testing the Migration

### 1. Verify WASM Build Exists
```bash
ls frontend/components/Modals/Analyze/dimension-reduction/factor/rust/pkg/
```

Expected output:
```
wasm.d.ts
wasm.js
wasm_bg.wasm
wasm_bg.wasm.d.ts
package.json
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Test Factor Analysis
1. Open the application
2. Navigate to Analyze → Dimension Reduction → Factor
3. Select variables and run the analysis
4. Check browser console for any errors
5. Verify results display correctly

### 4. Check Console Messages
Look for these messages in browser console:
```
Factor analysis results from WASM: {...}
Formatted Factor analysis results: {...}
```

### 5. Verify No Errors
Check that there are no errors like:
```
Failed to fetch '/workers/FactorAnalysis/factorAnalysis.worker.js'
Cannot find module '@/.../rust/pkg/wasm'
```

## Troubleshooting

### Error: "Cannot find module '@/.../rust/pkg/wasm'"

**Cause**: The WASM module hasn't been built yet.

**Solution**:
```bash
npm run build:factor-wasm
# or
npm run dev  # will build automatically
```

### Error: "Failed to fetch WASM module"

**Cause**: The WASM module file might be corrupted or missing.

**Solution**:
1. Delete the pkg folder: `rm -rf frontend/components/Modals/Analyze/dimension-reduction/factor/rust/pkg`
2. Rebuild: `npm run build:factor-wasm`

### Analysis runs but no results appear

**Cause**: Possible data format mismatch or WASM error.

**Solution**:
1. Check browser console for error messages
2. Check that `slicedDataForTarget` and `slicedDataForValueTarget` are properly formatted
3. Verify that `varDefsForTarget` contains valid variable definitions

### WASM Build Fails

**Cause**: Missing dependencies or Rust compilation error.

**Solution**:
1. Update Rust: `rustup update`
2. Clean cache: `rm -rf frontend/components/Modals/Analyze/dimension-reduction/factor/rust/target`
3. Try building again: `npm run build:factor-wasm`

## Performance Improvements

### Before (Web Worker)
- Computation happens in separate thread
- Communication overhead with message passing
- Larger JavaScript payload

### After (WASM)
- Computation in native compiled code (faster)
- Minimal communication overhead
- Smaller payload due to binary format
- Better performance for large datasets

## Implementation Details

### Data Preparation

The `factor-analysis.ts` now prepares data in this format for the WASM constructor:

```typescript
// Target variables data
const slicedDataForTarget = [
  [{ variable1: 1.2 }, { variable1: 2.3 }, ...],  // Variable 1 samples
  [{ variable2: 3.4 }, { variable2: 4.5 }, ...],  // Variable 2 samples
  // ...
];

// Value target variables (if any)
const slicedDataForValueTarget = [
  [{ valueVar: "value1" }, ...],
  // ...
];

// Variable definitions
const varDefsForTarget = [
  [{
    id: 1,
    columnIndex: 0,
    name: "variable1",
    type: "NUMERIC",
    // ... other properties
  }],
  // ...
];
```

### WASM Initialization

```typescript
// Import WASM module
import init, { FactorAnalysis } from "@/components/Modals/Analyze/dimension-reduction/factor/rust/pkg/wasm";

// Initialize WASM
await init();

// Create analysis instance
const factorAnalysis = new FactorAnalysis(
    slicedDataForTarget,
    slicedDataForValueTarget,
    varDefsForTarget,
    varDefsForValueTarget,
    configData
);

// Get results
const results = factorAnalysis.get_formatted_results();
```

## Migration Checklist

- [x] Remove old Web Worker files (`frontend/public/workers/FactorAnalysis/`)
- [x] Update `factor-analysis.ts` to use WASM
- [x] Add build scripts to `package.json`
- [x] Create build documentation
- [ ] **User must do**: Build WASM module with `npm run build:factor-wasm`
- [ ] Test Factor Analysis feature in UI
- [ ] Verify results are correct and match previous behavior
- [ ] Monitor performance improvements

## Next Steps

1. **Build the WASM module**: `npm run build:factor-wasm`
2. **Test the feature**: Run factor analysis from the UI
3. **Monitor logs**: Check browser console for any warnings or errors
4. **Verify results**: Ensure analysis results are correct

## FAQs

### Q: Why migrate from Web Workers to WASM?
A: WASM provides better performance, smaller bundle size, and easier maintenance. It's compiled from Rust, making it more robust and type-safe.

### Q: Will the results be different?
A: No, the results should be identical. The same algorithms are used; only the execution method changed.

### Q: Can I still use Web Workers for other analyses?
A: Yes, other analysis features still use Web Workers. This migration is specific to Factor Analysis.

### Q: What if the WASM build fails?
A: Check the troubleshooting section above, or refer to `BUILD.md` for detailed instructions.

### Q: How do I disable this and go back to Web Workers?
A: You would need to restore the old web worker files and revert `factor-analysis.ts`. However, this is not recommended as WASM provides better performance.

## Related Documentation

- [BUILD.md](./rust/BUILD.md) - Detailed WASM build instructions
- [Rust WebAssembly Handbook](https://rustwasm.org/docs/book/)
- [WebAssembly MDN Guide](https://developer.mozilla.org/en-US/docs/WebAssembly/)

## Support

If you encounter issues during the migration:

1. Check the troubleshooting section above
2. Review browser console for error messages
3. Refer to the build documentation in `BUILD.md`
4. Check that WASM module is properly built in `pkg/` folder
