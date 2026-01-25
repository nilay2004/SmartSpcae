# Blueprint3D - Quick Project Summary

## Elevator Pitch (30 seconds)

**Blueprint3D** is a web-based 3D interior design application built with TypeScript and Three.js. It allows users to create 2D floor plans interactively and visualize them in real-time 3D, all running in a web browser without any software installation. The system maintains perfect synchronization between 2D editing and 3D visualization using advanced geometric data structures.

---

## Technology Stack

- **Language**: TypeScript (compiled to JavaScript)
- **3D Graphics**: Three.js (WebGL)
- **Build Tool**: Grunt
- **DOM Manipulation**: jQuery (legacy)
- **Key Algorithm**: Half-Edge Data Structure for geometric modeling

---

## Core Features

1. **2D Floor Plan Editor**
   - Interactive wall drawing and editing
   - Corner manipulation
   - Automatic room detection
   - Real-world measurements

2. **3D Visualization**
   - Real-time 3D rendering
   - Camera controls (orbit, pan, zoom)
   - Lighting and shadows
   - Texture support

3. **Item Placement System**
   - Multiple item types (floor, wall, in-wall)
   - Collision detection
   - Resize and rotation
   - Drag-and-drop placement

4. **Synchronization**
   - Changes in 2D automatically reflect in 3D
   - Event-driven architecture
   - Consistent geometric representation

---

## Project Structure

```
src/
├── core/          # Utilities, configuration, logging
├── model/         # Data models (Floorplan, Room, Wall, Scene)
├── floorplanner/  # 2D floor plan editor
├── three/         # 3D rendering and controls
├── items/         # Furniture/item system (factory pattern)
└── blueprint3d.ts # Main entry point
```

---

## Key Technical Concepts

### Half-Edge Data Structure
- Represents walls as directed edges
- Enables room detection by traversing connected edges
- Maintains topological relationships
- Critical for spatial queries

### Room Detection Algorithm
- Graph traversal on half-edge structure
- Finds closed loops (rooms)
- Handles complex geometries

### Model-View Architecture
- Model: Single source of truth (Floorplan + Scene)
- Views: 2D Floorplanner and 3D Renderer
- Event callbacks for synchronization
- Loose coupling between components

---

## Interview Questions Quick Reference

**Q: What was the biggest challenge?**
A: Maintaining geometric consistency between 2D and 3D views while ensuring real-time performance.

**Q: Why half-edge structure?**
A: Enables efficient room detection and spatial queries from wall geometry.

**Q: How does 2D-3D sync work?**
A: Event-driven architecture with the Model as single source of truth, views observe and update.

**Q: Performance optimizations?**
A: Efficient geometry updates, shadow map optimization, event throttling, minimal scene graph changes.

**Q: How extensible is it?**
A: Factory pattern for items, event callbacks for plugins, modular architecture - but needs refactoring per TODOs.

---

## Sample Code Structure (Key Classes)

```typescript
// Main Application
BP3D.Blueprint3d
  - Model (floorplan + scene)
  - Three.Main (3D renderer)
  - Floorplanner (2D editor)

// Core Model
Model.Floorplan → Walls, Corners, Rooms
Model.Room → Detected from floor plan
Model.HalfEdge → Geometric representation
Model.Scene → 3D items

// Views
Floorplanner.Floorplanner → 2D canvas editor
Three.Main → 3D WebGL renderer

// Items
Items.Factory → Creates item types
Items.FloorItem, WallItem, InWallItem, etc.
```

---

## Areas for Improvement (From TODOs)

- Remove jQuery dependency
- Add test suite
- Better serialization format
- Update Three.js version
- Refactor Three.js code to ES6 classes
- Complete documentation
- Better API design
- Formal persistence layer

---

## Browser Compatibility

- Requires WebGL support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- No plugins required (pure web technologies)

---

## Use Cases

- Interior design visualization
- Home renovation planning
- Real estate presentation
- Furniture placement simulation
- Educational tool for architecture/design

---

## Learning Outcomes

- 3D graphics programming (WebGL/Three.js)
- Geometric algorithms and data structures
- Real-time synchronization patterns
- Event-driven architecture
- TypeScript for complex applications
- Performance optimization for graphics

---

*For detailed explanations and full interview Q&A, see INTERVIEW_PREPARATION.md*

