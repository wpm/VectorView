# Vector View

An interactive playground for building intuition about 2D linear transformations, aimed at upper-level undergraduates who
know the definitions but are still developing a feel for them.

## Running it

Open `index.html` in any modern browser. That's the whole install — the app is a single self-contained file with no
dependencies, no build step, and no network access required. It works offline and can be shared by sending the one file.

## What it shows

The canvas displays the plane with a fixed gray reference grid and a blue grid that gets carried along by the matrix
**M**. The two columns of M are drawn as the images of the basis vectors **î** (green) and **ĵ** (red), and everything
else on screen is derived live from M as you change it.

The core interaction loop: edit the matrix (by typing entries, choosing a preset, or **dragging the arrow tips of î and ĵ
directly on the canvas**), then press **Play** to animate the plane morphing from the identity to M. Dragging the **t
slider** moves through the animation by hand — t = 0 is the untouched plane, t = 1 is the fully applied transform, and
anywhere in between is a freeze-frame you control. Stepping through slowly like this is often the fastest way to see what
a transformation is actually doing.

Overlays, each with its own toggle in the **Show** panel:

- **Unit square (det)** — the unit square and its image parallelogram, shaded green when orientation is preserved and red
  when it flips, with the live area (= |det M|) printed inside.
- **Eigenvectors** — dashed purple lines marking the invariant directions, with eigenvalue labels. During the animation
  you can watch vectors on those lines stay on them.
- **Vector v and Mv** — a draggable amber test vector and its image.
- **Decompose Mv** — a dashed staircase showing Mv = v₁·(Mî) + v₂·(Mĵ): the same coordinates, applied to the new basis.
- **Unit circle image** — the unit circle and the ellipse it maps to.
- **Null / column space** — when M is singular, the line that gets crushed to the origin and the line the whole plane
  lands on.

The **Analysis** panel reports det, trace, rank, the characteristic polynomial, and the eigenvalues/eigenvectors —
including the complex, repeated-defective, and uniform (M = λI) cases, each explained in words. The **Vector v** panel
shows v's coordinates in the transformed basis (M⁻¹v) and has a **v ← Mv** button for iterating the map, which turns the
app into a live power-iteration demo.

The **Explore concepts** section holds seven short guided tours. Each one sets up the matrix, the overlays, and the
animation for a specific idea and explains what to look for. `GUIDE.md` goes through them in depth with suggested
experiments.

## Controls reference

| Action | How |
|---|---|
| Edit the matrix | Type in the entries, click a preset, or drag the î / ĵ arrow tips |
| Animate identity → M | ▶ Play, or drag the t slider by hand |
| Move the test vector | Drag the amber handle (works on v or on its image Mv) |
| Iterate | **v ← Mv** button |
| Pan / zoom | Drag the background / scroll wheel |
| Precise dragging | Uncheck *snap to ½ grid* |
| Transpose, invert | Buttons under the matrix |

## Project layout

- `index.html` — the entire application (markup, styles, and code)
- `README.md` — this file
- `GUIDE.md` — a student's walkthrough of the seven concept tours
- `dev/` — build parts and the headless-browser test script used during development

## Design notes

The matrix is stored as `[a, b, c, d]` for M = [[a, b], [c, d]], so the columns (a, c) and (b, d) are the images of î and
ĵ. The animation linearly interpolates the identity toward M entrywise, which keeps the grid readable mid-flight.
Eigenvalues are computed in closed form from the characteristic polynomial; the code distinguishes real-distinct,
complex, repeated-defective (one eigenvector, e.g. a shear), and uniform-scaling (every vector is an eigenvector) cases
rather than pretending they're all alike, because those distinctions are exactly what students trip over.
