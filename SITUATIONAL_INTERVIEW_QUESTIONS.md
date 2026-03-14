# Situational Interview Questions - Blueprint3D

These questions focus on real-world scenarios you might face after deploying the Blueprint3D project. They test your ability to handle production issues, scalability, and performance.

---

### 1. **Deployment & Initial Crash**
**Question**: "We just deployed the latest version of Blueprint3D to production, but users are reporting that the application crashes immediately upon loading. What are your immediate steps to recover and investigate?"

**Detailed Answer**:
1.  **Immediate Rollback**: My first priority is to restore service. I would immediately roll back the deployment to the last known stable version using our CI/CD platform (e.g., Vercel, GitHub Actions). This gives us time to investigate without user impact.
2.  **Isolate the Environment**: I'd check if the crash is environment-specific. Does it happen on my local machine? On the staging server? If it only happens in production, I'd look for configuration differences (e.g., missing environment variables, incorrect asset paths, or CDN caching issues).
3.  **Analyze Client-Side Logs**: Since Blueprint3D is a frontend-heavy application, I would check monitoring tools like Sentry or LogRocket for "Uncaught Exceptions." Common culprits are `TypeError` (accessing a property of undefined) or `ReferenceError`.
4.  **Audit Build Artifacts**: I'd verify the production build. Sometimes the TypeScript compilation or the minification process (Uglify/Terser) can break logic that worked in development. I'd also check if all 3D models and textures are correctly uploaded and accessible via their production URLs.
5.  **Browser Compatibility**: I'd test across different browsers. A new feature might rely on a WebGL extension or a JS API not supported in older browsers or Safari, causing a crash.

---

### 2. **Scalability & High Traffic**
**Question**: "The project has become very popular, and we're seeing thousands of concurrent users. The application is becoming extremely slow, and the assets (models/textures) are taking forever to load. How would you handle this?"

**Detailed Answer**:
1.  **Global Asset Delivery (CDN)**: Blueprint3D relies on heavy 3D assets. I would move all models and textures to a Content Delivery Network (CDN) like Amazon CloudFront or Cloudflare. This ensures assets are served from the nearest geographical edge location, reducing latency and offloading the main server.
2.  **Implement Lazy Loading**: Currently, we might be loading many assets upfront. I would refactor the item catalog to use lazy loading—only fetching the 3D model when the user actually drags it into the room.
3.  **Asset Optimization**: I would audit our 3D models and textures. Large textures (e.g., 4K JPGs) should be compressed to WebP or smaller resolutions. High-polygon models should be simplified using tools like Blender or automated scripts to reduce the WebGL rendering load.
4.  **Browser Memory Management**: High user count means users with varying hardware. I'd ensure proper memory cleanup in Three.js. When a user deletes an item or clears a room, I must explicitly call `geometry.dispose()` and `material.dispose()` to prevent memory leaks that could crash the user's browser tab.
5.  **State Persistence Optimization**: If we are saving plans to a database, I would implement debouncing on the "Save" function to prevent thousands of rapid-fire API calls from crashing the backend.

---

### 3. **Data Corruption & Persistence**
**Question**: "A user reports that they spent 3 hours designing a floor plan, but when they saved and reloaded it, the walls are missing or the layout is completely broken. How do you approach this?"

**Detailed Answer**:
1.  **Analyze the Serialization JSON**: I would request the saved JSON file from the user (if possible) and validate it against our expected schema. I'd look for `NaN` values in coordinates or missing `half-edge` pointers, which are critical for room detection.
2.  **Versioned Data Migration**: If we recently updated the floor plan model (e.g., added wall thickness), old saved plans might be incompatible. I would implement a "Migration Layer" that detects the version of the saved data and transforms it into the current format before loading.
3.  **Defensive Loading Logic**: I would wrap the loading process in `try-catch` blocks. If one furniture item is corrupted, the system should log an error, skip that item, and continue loading the rest of the room instead of crashing the entire application.
4.  **Local Storage as a Safety Net**: I would implement an "Auto-Save" feature to the browser's `localStorage` or `IndexedDB`. If the server-side save fails or the data gets corrupted during transmission, the user can recover their work from their local machine.
5.  **Reproduce via Unit Tests**: Once the bug is found, I'd write a unit test specifically for that corrupted data structure to ensure that future changes don't re-introduce the same bug.

---

### 4. **Performance Degeneration (FPS Drop)**
**Question**: "As designs get more complex (e.g., a whole office building with 50+ rooms), the frame rate drops to 10 FPS. How do you optimize the 3D rendering performance?"

**Detailed Answer**:
1.  **Reduce Draw Calls**: Each furniture item is a separate mesh. I would look into "Instanced Rendering" for repetitive items (like chairs in an office). This allows the GPU to render many copies of the same object in a single draw call.
2.  **Lighting Optimization**: Real-time shadows are very expensive. I would limit the number of shadow-casting lights or implement "Baked Shadows" for static walls and floors.
3.  **Occlusion Culling**: In a large building, you don't need to render rooms that are behind walls or on different floors. I would implement a simple occlusion culling system to stop rendering objects that aren't visible to the camera.
4.  **Level of Detail (LOD)**: For complex furniture items, I would provide multiple versions of the model. When the camera is far away, we render a low-poly version; we only show the high-detail model when the user zooms in.
5.  **Worker-Based Computation**: Geometric calculations like "Room Detection" or "Intersection Tests" can be moved to a Web Worker. This keeps the main UI thread free for rendering, ensuring the 3D view remains responsive even during heavy calculations.

---

### 5. **Cross-Browser/Device Failures**
**Question**: "The app works perfectly on Chrome but the 3D view is completely blank on Safari or on certain mobile devices. How do you debug this?"

**Detailed Answer**:
1.  **Check WebGL Support**: I'd use a tool like `WebGLReport.com` on the target device to see if it supports the required WebGL version or specific extensions (like `OES_element_index_uint`) that Three.js might be using.
2.  **Shader Compilation Errors**: I'd check the console for shader compilation errors. Safari can be stricter with GLSL syntax than Chrome.
3.  **Coordinate Precision**: Mobile devices often have lower precision for floating-point numbers in shaders (`mediump` vs `highp`). This can cause rendering artifacts or blank screens in 3D views.
4.  **Polyfills and Transpilation**: I'd verify that our TypeScript target is set correctly (e.g., ES5 or ES6) and that we are including necessary polyfills for older browsers.
5.  **Remote Debugging**: I would use Safari's Web Inspector (via a Mac) or Chrome's Remote Debugging for Android to inspect the live console and network traffic on the failing device.
