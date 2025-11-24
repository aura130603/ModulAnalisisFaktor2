# Building Factor Analysis WASM Module

This guide provides instructions for compiling the Rust-based Factor Analysis WASM module.

## Prerequisites

Before building, ensure you have the following installed:

1. **Rust** (latest stable version)
   - Install from: https://www.rust-lang.org/tools/install

2. **wasm-pack** (WebAssembly package manager)
   - Install via cargo:
   ```bash
   cargo install wasm-pack
   ```

3. **Node.js** (v16 or later)
   - Required for running the development server

## Build Instructions

### Step 1: Navigate to the Rust directory
```bash
cd frontend/components/Modals/Analyze/dimension-reduction/factor/rust
```

### Step 2: Build the WASM module

For **development** (unoptimized, faster build):
```bash
wasm-pack build --target web
```

For **production** (optimized, smaller file size):
```bash
wasm-pack build --target web --release
```

### Step 3: Verify the build

After successful build, you should see a `pkg` folder containing:
- `wasm.js` - JavaScript bindings
- `wasm.d.ts` - TypeScript type definitions
- `wasm_bg.wasm` - The compiled WebAssembly module
- `wasm_bg.wasm.d.ts` - Type definitions for the WASM module
- `package.json` - Package metadata

## Automated Build (Optional)

You can add a build script to the root `package.json` if needed:

```json
{
  "scripts": {
    "build:factor-wasm": "cd frontend/components/Modals/Analyze/dimension-reduction/factor/rust && wasm-pack build --target web --release"
  }
}
```

Then run:
```bash
npm run build:factor-wasm
```

## Troubleshooting

### Build fails with "wasm-pack not found"
- Ensure wasm-pack is installed: `cargo install wasm-pack`
- Verify it's in your PATH: `wasm-pack --version`

### Build fails with Rust compilation errors
- Update Rust: `rustup update`
- Clean previous builds: `cargo clean`
- Try building again: `wasm-pack build --target web`

### The `pkg` folder is not created
- Check the build output for errors
- Ensure all Rust dependencies are valid
- Try deleting `Cargo.lock` and rebuilding

## Development Workflow

1. **First time setup:**
   ```bash
   wasm-pack build --target web
   npm install  # In frontend directory
   npm run dev  # Start development server
   ```

2. **After modifying Rust code:**
   ```bash
   cd frontend/components/Modals/Analyze/dimension-reduction/factor/rust
   wasm-pack build --target web
   # The dev server should hot-reload automatically
   ```

## Integration with Development Server

Once built, the WASM module is automatically imported in:
- `frontend/components/Modals/Analyze/dimension-reduction/factor/services/factor-analysis.ts`

The TypeScript code handles initialization via:
```typescript
import init, { FactorAnalysis } from "@/components/Modals/Analyze/dimension-reduction/factor/rust/pkg/wasm";

// ...
await init();  // Initialize WASM module
const analysis = new FactorAnalysis(...);  // Create analysis instance
```

## Performance Notes

- **Development builds** (`wasm-pack build --target web`): Faster build times, useful for development
- **Release builds** (`wasm-pack build --target web --release`): Smaller file size and better runtime performance, recommended for production

## Additional Resources

- [wasm-pack Documentation](https://rustwasm.org/docs/wasm-pack/)
- [WebAssembly MDN Guide](https://developer.mozilla.org/en-US/docs/WebAssembly/)
- [Rust WASM Book](https://rustwasm.org/docs/book/)
