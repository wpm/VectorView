# A Student's Guide to Vector View

You already know the definitions — determinant, eigenvector, null space. This guide is about connecting those definitions to what you can *see*. Work through the seven tours in the **Explore concepts** panel in order; each section below adds experiments the tour card doesn't have room for.

A notational note used throughout the app: î′ and ĵ′ mean the images Mî and Mĵ — the columns of M.

## 1. A matrix is where the basis lands

The single most useful mental model in the course: **the columns of M are the landing spots of î and ĵ, and that's the entire matrix.** Nothing else needs to be specified, because linearity forces everything else.

Run the tour (a shear), then drag the green and red arrow tips around. Watch the matrix entries update as you drag — you are writing the matrix with your hands. Predict-then-check: before dragging î to (0, 1) and ĵ to (−1, 0), ask yourself what transformation that is. (Drag it. Was it the rotation you expected?)

Experiment: make the two columns point in the same direction. What happens to the grid? Check the determinant readout before reading section 5.

## 2. Matrix–vector multiplication is a change of basis

The tour draws a dashed "staircase" for v = (1, 1.5): one step of size 1 along î′, then 1.5 along ĵ′. That staircase *is* the computation Mv — the same coordinates v always had, just measured along the new basis vectors.

Drag the t slider slowly back and forth (t = 0 is the original plane, t = 1 the fully applied transform). The staircase bends with the grid, but its step sizes never change. This is the picture behind the formula

Mv = v₁·(Mî) + v₂·(Mĵ)

and it's why multiplying by M is the same as answering: "where does the point with grid-coordinates (v₁, v₂) end up when the grid itself moves?"

The **Vector v** panel also shows the reverse question: the coordinates of v *in the new basis*, which is M⁻¹v. Going forward is multiplication; going back is the inverse. If that pairing feels asymmetric, load the **Rank 1** preset and see what the panel says instead — and why.

## 3. Determinant = area scaling factor

The green unit square becomes a parallelogram of area |det M|, always. Drag the basis vectors and watch the printed area track the determinant continuously.

Three things to make yourself see: first, det = 0 happens *exactly* when the columns become parallel — the parallelogram degenerates to a segment. Second, load **Reflect x**: the area is still 1 but det = −1, and the shading turns red; a negative determinant means orientation reversal, not shrinkage. Third, play the animation on **Rotate 45°** — rotations slide the square around without changing its area at all, which is why det(rotation) = 1.

Experiment: set M = [[2, 0], [0, 3]] by typing entries. Predict det before looking. Then click **Transpose** — why doesn't the determinant change?

## 4. Eigenvectors: the directions that don't turn

Play the animation on the symmetric preset [[2, 1], [1, 2]] with eigenvectors on. The whole plane lurches, but vectors along the purple dashed lines just stretch in place: by ×3 along (1, 1), by ×1 along (1, −1).

The thing to internalize is that eigenvectors are a property of the *transformation*, not of any particular vector you drew. Drag î and ĵ around and watch the purple lines swing to the new invariant directions in real time.

Edge cases worth provoking on purpose, using the Analysis panel as your guide: load **Shear** — one repeated eigenvalue but only *one* eigenvector direction (a defective matrix; the diagonal is the only line the shear leaves alone). Type in M = [[2, 0], [0, 2]] — now *every* vector is an eigenvector, because M = 2I. Load **Rotate 90°** — no purple lines at all, and the panel reports λ = ±i. Which brings us to tour 6.

## 5. Null space: what gets crushed

With the rank-1 preset, det = 0 and the blue grid collapses onto a single line — the **column space**. The rose dashed line is the **null space**: drag v onto it and watch Mv snap to the origin. An entire line of inputs shares the single output 0, which is precisely why a singular matrix can't be inverted — Mx = b either has no solution (b off the column space) or a line of them (b on it).

Notice the dimension bookkeeping in the Analysis panel: rank 1 + nullity 1 = 2. The rank–nullity theorem is just "dimensions have to go somewhere."

Experiment: the null space here is also the λ = 0 eigenline — check the eigenvector readout. Being crushed to zero is the extreme case of being scaled.

## 6. Complex eigenvalues: rotation in disguise

The preset [[0.9, −0.7], [0.7, 0.9]] rotates as it scales, so no real direction maps to itself and the eigenvalues come out complex: λ = 0.9 ± 0.7i. The pair still tells you everything: |λ| = √1.3 ≈ 1.14 is the growth factor per application, and arg λ ≈ 38° is the turn per application.

Click **v ← Mv** about ten times and watch v trace a growing spiral — each click grows it ~14% and turns it ~38°. Then edit the matrix to [[0.6, −0.5], [0.5, 0.6]] (|λ| < 1) and iterate again: the spiral now collapses inward. Complex eigenvalues with |λ| ≷ 1 are the difference between an unstable and a stable spiral — the picture behind stability analysis of linear systems.

## 7. Power iteration: eigenvectors attract

Back to [[2, 1], [1, 2]], starting v off-axis. Iterate v ← Mv repeatedly (zoom out as you go). The direction of v converges to the λ = 3 eigenline, because the (1, 1)-component of v is tripled every round while the (1, −1)-component merely survives. After k iterations their ratio has grown by (3/1)ᵏ — the dominant eigenvector doesn't just sit still, it *attracts*.

This is power iteration, the simplest eigenvalue algorithm, and the reason "largest eigenvalue" dominates long-run behavior everywhere: Markov chains settling to stationary distributions, PageRank ranking the web, populations approaching stable age structures.

Experiment: start v exactly on the (1, −1) eigenline and iterate. In exact arithmetic it should stay there forever. Does it? (Nudge it a pixel off and see how quickly the dominant direction takes over — that's numerical instability and eigen-attraction in one picture.)

## Where to go from here

Things the app quietly demonstrates that you can chase in your textbook: why det(AB) = det(A)det(B) (areas scale multiplicatively — compose two presets by hand and check), why symmetric matrices have orthogonal eigenvectors (look at tours 4's purple lines), and what the singular value decomposition measures (the unit-circle-to-ellipse toggle: the ellipse's axes are the singular directions, even when eigenvectors are complex or missing).
