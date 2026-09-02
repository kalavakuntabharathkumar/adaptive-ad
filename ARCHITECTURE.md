# Architecture

## The big picture

This project is built around one core idea. An advertisement is described once, a target screen is described once, and everything else follows from those two descriptions alone.

Nothing in this system hand authors a layout for a specific screen. The screen is just data. The algorithm reads that data and works out where everything should go on its own.

The way information moves through the system looks roughly like this, going from top to bottom.

An advertisement description, combined with a surface description, goes into the resolver.

The resolver produces a resolved layout, which is nothing more than a flat list of boxes and visibility flags.

That resolved layout goes into a renderer.

The renderer produces something a person can actually look at, in this case real positioned elements on a page.

The React app sits on top of that whole chain, and its only job is picking a surface, showing the result, and displaying a little information about what happened.

Nothing above the resolver knows anything about how layout math actually works. Nothing below the resolver knows anything about which specific screen it is currently dealing with. The resolver is the only place in the entire system where a decision gets made based on what a surface's numbers actually are.

---

## What each file is responsible for

The ad description lives in the spec file.

It defines what a single piece of an ad looks like, and what a whole ad looks like as a collection of those pieces.

It also includes a runtime check that walks through an ad and confirms every piece is genuinely valid before anything else in the app is allowed to use it.

And it contains the one sample ad this project actually ships with, ready to go the moment the app starts.

The surface definitions live in their own separate file.

They describe the dimensions, safe margins, minimum tap target, minimum readable text size, viewing distance, and touch only flag for each of the six demo surfaces.

They also carry a smaller flag that opts a surface into a more deliberate horizontal composition style, which is covered in more detail further down in this document.

The resolver is the actual algorithm, and it lives entirely on its own.

Every function inside it is a small, plain piece of logic that takes plain data in and hands plain data back out.

Nothing in this file has any concept of React, the DOM, colors, or fonts. It only ever deals with numbers, roles, and rules.

This is also the only file in the whole project that derives an effective minimum tap target, by combining a surface's explicit tap target setting with its touch only flag. That combination of rules only has to be understood correctly in exactly one place because of that.

The shape of a resolved layout has its own small file.

It defines what a single box looks like, what a single resolved piece of an ad looks like once it carries a box, a visibility flag, and its resolved text size or tap target if relevant, and what a full resolved layout looks like as a list of those.

This file is really the contract between the resolver and anything that wants to draw its output.

The rendering logic lives in its own file too, separate from everything else.

Its main job is a function that takes the original ad, the resolved layout, and the surface, and turns all three into real, positioned pieces of React content.

It reads the resolved text size and applies it directly as a font size.

It reads the resolved tap target and applies it as a minimum width and height on buttons.

It hides anything the resolver marked as not visible.

Nothing about how layout decisions were made lives in this file. It only ever draws what it is told to draw.

The app file wires the surface picker, the live preview, and the side information panels together.

It calls the resolver, it calls the renderer, and it manages a bit of its own state around which surface and which ad are currently selected.

That state also covers the small live editing feature that lets someone tweak an ad's content and watch the layout respond right away.

It does not contain any layout math or any drawing logic of its own. Everything it shows on screen ultimately came from the resolver and the renderer.

The validation suite lives in its own file as well.

It is a self contained set of checks, currently nineteen of them, that exercise the resolver directly, without relying on any testing framework.

It can be run straight from npm test, or directly through the file itself if someone wants to run it outside of npm for any reason.

---

## Walking through what the resolver actually does

The resolver's entry point takes a list of ad pieces and a single surface, and returns a resolved layout.

Everything else inside the file exists purely to support that one entry point.

The first real step works out the usable area on the screen, meaning the surface's width and height with its safe margin subtracted out.

The second step decides on a composition direction, and this is worked out purely from the surface's aspect ratio.

A tall, narrow shape leads to a vertical composition.

A wide, short shape leads to a horizontal one.

Anything closer to square in between leads to a balanced composition that borrows a little from both of the others.

This is the only point in the whole file where a decision is made based on a surface's actual shape, and it never once checks what that surface happens to be named.

From there, a loop begins with every remaining piece of the ad still in play.

On each pass, the current set of pieces gets sized and positioned according to the chosen composition direction.

That sizing leans on a shared idea of preferred size, meaning what a piece would like to have if space were unlimited, and minimum size, meaning the smallest it can shrink down to before it must be dropped instead.

Once a candidate layout exists, it gets checked against every rule that has to hold true for it to actually count as valid.

Every piece needs to have been placed somewhere.

Nothing can end up with a size of zero or less.

Everything needs to sit fully inside the usable area, without spilling past any edge.

No two visible pieces are allowed to overlap.

Text needs to be tall enough to genuinely hold its content at the surface's minimum readable size.

Buttons need to be large enough to satisfy the surface's tap target requirement.

And a call to action button always keeps enough width for its own label, no matter what.

If that candidate layout passes every one of those checks, it is returned immediately, along with hidden entries for anything already excluded from this pass.

If it does not pass, exactly one piece gets removed. Specifically, the least important piece still remaining.

Ties get broken by whichever piece comes later in the original list, so the outcome stays predictable rather than random.

The whole process then repeats with that smaller set of pieces.

If the loop runs all the way down and nothing has worked, there is one last fallback attempt that tries to place only the single most important piece by itself.

If even that fails, everything is returned hidden, rather than allowing anything to render in a broken or overlapping state.

---

## How the effective tap target actually gets combined

There are two separate pieces of information on a surface that both relate to tap targets.

There is an explicit minimum tap target a surface can state directly.

And there is a touch only flag saying whether touch is the only way anyone can interact with that surface at all.

Rather than reading either of those two fields directly in more than one place, the resolver combines them through a single small helper.

If a surface states an explicit minimum tap target, that number wins.

If it does not, but the surface is marked touch only, a sensible forty four pixel default is used instead, since a touch only surface genuinely has no other way for someone to interact with something too small.

If neither applies, there is simply no tap target requirement at all.

Every place in the resolver that previously needed a tap target number, including the actual sizing logic and the value eventually handed to the renderer, goes through that same single helper now.

That means the touch only fallback behavior only had to be gotten right in exactly one spot, rather than being repeated and potentially drifting apart across several different places in the code.

---

## Walking through one concrete example

It helps to actually trace what happens for two very different surfaces, using the same six piece ad both times, just to see the difference play out in practice.

Take the mobile portrait surface first. It is tall and narrow, so the aspect ratio calculation lands on a vertical composition. The resolver stacks the headline, the product image, the price, the call to action, the product name, and the logo one above another, each one centered horizontally, each one getting a share of the available height based on its role. The hero image gets the largest single share, since it is the most visually important piece and priority one. The logo gets the smallest.

Now take the broadcast lower third instead. It is extremely wide and quite short, so the aspect ratio calculation lands on a horizontal composition, and since this particular surface opts into the more deliberate composition path, described further down, the resolver treats the hero image, the surrounding text, and the action separately, placing them side by side rather than stacked. The text no longer needs to compete with the image for vertical space the way it did in the portrait case. It instead competes for horizontal space against the image and the button sitting beside it.

Nothing about that difference was written by hand for either surface. The same resolver function ran both times, starting from the same six pieces, and the surface's own numbers alone were enough to produce two genuinely different arrangements.

Now take the constraint test surface, which is deliberately far too small to hold everything. The resolver starts the same way it always does, attempting to place all six pieces. That attempt fails the feasibility check, most likely because pieces cannot all fit inside the tiny usable area even at their minimum sizes. The lowest priority piece gets removed, and the resolver tries again with five pieces instead of six. That still fails, so another lowest priority piece is dropped. This keeps happening until whatever remains, in this case the headline, the product name, and the product image, actually fits cleanly. The pieces that got removed along the way are returned as hidden entries rather than simply vanishing from the output entirely, which is what lets the app's info panel show exactly which pieces were dropped and in what order.

---

## Adding a brand new surface

Adding a new target surface to this project does not require touching the resolver at all.

The resolver only ever reads generic fields off a surface, things like its width, height, safe margin, minimum tap target, minimum text size, touch only flag, and viewing distance, and it derives its layout direction purely from the surface's aspect ratio. It never checks a surface's name or identity anywhere.

To add a new surface in practice, a new entry just needs to be added to the surfaces file with whatever fields make sense for that screen, and a matching label needs to be added wherever the app's surface picker keeps its list of readable names.

That is genuinely the whole process. The validation suite already includes a check that constructs a surface that was never part of the demo set at all, purely to confirm the resolver's output stays correct and well formed for a surface it has never encountered before. That check exists specifically to prove this is a general algorithm, not a lookup table keyed on the names of the surfaces that happen to ship with this project.

---

## Adding a brand new renderer

Every renderer that could ever exist for this project is meant to consume the exact same resolved layout that comes out of the resolver. The resolver itself has no knowledge of, or dependency on, React, the DOM, or any particular rendering target at all.

A new renderer, something that draws to a canvas instead of the page for example, would call the resolver exactly the way the app already does, walk through the resulting list of resolved pieces, and for each one that is visible, use its box to know where and how large to draw it, along with its resolved text size or tap target wherever the target medium actually needs those numbers.

A renderer built this way would never need to reach into the resolver's internal functions directly. Its only real contract with the rest of the system is the resolved layout itself, going in as input and coming back out as output.

The current DOM renderer is a real, working demonstration of exactly this shape. It has no internal state of its own, does not call into the resolver at all, and only ever consumes the resolved layout contract. A second renderer, such as one drawing to a canvas, would sit alongside it following the same shape, but that second renderer has not actually been built yet in this project. That specific piece remains a demonstrated design intention rather than something proven twice over.

---

## The two paths through a horizontal layout, and why that is worth mentioning

For wide, horizontal surfaces specifically, there are actually two different ways the resolver can arrange things.

There is an older, simpler approach that splits the available space into a small number of named regions, one broadly for information, one for the hero image, and one for actions.

That older approach then sizes and shrinks those regions against each other as needed, roughly the same way the vertical composition sizes and shrinks individual pieces.

There is also a newer, more deliberate approach that composes the hero image, the surrounding text, and the actions together more tightly.

That newer approach currently produces a more considered result for the two surfaces it is actually used on.

Which of the two runs for a given surface is controlled by a small flag set directly on that surface's own definition, not by checking what the surface is called anywhere inside the resolver itself.

So even with two separate strategies existing side by side, nothing about this violates the underlying rule that no surface is ever special cased by its identity.

That said, this is genuinely the least clean part of the current design.

The two approaches share a fair amount of conceptual overlap.

Folding them into one shared horizontal strategy, rather than maintaining two separate ones, is the clearest next structural improvement available in this codebase.

It is called out here directly rather than being left for someone else to stumble across later on their own.

---

## Design choices this project leans on

Every behavior tied to a surface comes from data on that surface, never from checking its name or identity anywhere in the code. The one flag controlling which horizontal strategy runs is itself just another piece of data on the surface, not a name check.

The layout direction chosen for a surface is always derived from that surface's actual shape, never declared separately anywhere.

How important a piece of an ad is lives entirely on that piece itself, not on any surface or layout configuration. That means the exact same piece degrades in the exact same order no matter which surface happens to be shrinking it at the time.

Validation of an ad's shape happens once, right at the point where the ad is defined, so nothing further downstream in the app ever needs to re-check whether the ad it is working with is actually valid.

The resolver itself is pure. It takes plain data in, and it returns plain data out. There is no direct access to the DOM anywhere inside it, no React, and no side effects of any kind. That purity is exactly what makes it realistic to imagine a second renderer being added later without needing to touch or understand the resolver's internals at all.

Rendering never gets to make its own layout decisions. The rendering file positions and styles things strictly based on what the resolved layout already told it. Any styling rule that might look like it is describing layout, such as a fallback font size written directly into the stylesheet, is explicitly a fallback only, and only ever applies in the rare case where the resolver did not supply its own value for that piece.

---

## Why things are split up this way

It would have been possible to write all of this as one large file, or even to let the app file do its own layout math directly rather than calling out to a separate resolver at all. That approach was deliberately avoided.

Keeping the resolver as a standalone file with no React dependency at all means it can be tested completely on its own, outside of a browser, using nothing more than plain function calls and assertions. That is exactly what the validation suite does. None of those nineteen checks ever render anything to a screen. They call the resolver directly, inspect the plain data it returns, and check that data against the rules that are supposed to hold.

Keeping the resolved layout shape in its own tiny file, separate from the resolver itself, means that shape can be treated as a stable contract. Anything that wants to consume a resolved layout, whether that is the current renderer or a future one, only ever needs to agree on that one small file, not on anything about how the resolver internally works.

Keeping the rendering logic separate from the app file means the app file stays focused purely on state and user interaction, things like which surface is selected and which ad is currently active, rather than being cluttered with styling and DOM construction details that have nothing to do with state management.

None of this separation was purely theoretical. The renderer genuinely does not import anything from the resolver file, and the resolver genuinely does not import anything from React or from the rendering file. Those are real, checkable facts about the code as it stands today, not just an intention described in prose.

---

## File structure

```
adaptive-ad/
  index.html
  package.json
  package-lock.json
  tsconfig.json
  tsconfig.app.json
  tsconfig.node.json
  vite.config.ts
  .oxlintrc.json
  .gitignore
  README.md
  ARCHITECTURE.md
  public/
    favicon.svg
    icons.svg
    logo.png
    product.png
  src/
    spec.ts
    surfaces.ts
    resolver.ts
    resolved-layout.ts
    render-dom.tsx
    resolver.test.ts
    App.tsx
    App.css
    index.css
    main.tsx
```

The spec file, the surfaces file, the resolver, and the resolved layout file together make up the part of the project that has no idea React or the browser exist at all. They could be lifted out into a completely separate package with no changes needed.

The rendering file and the app file are where the browser specific side of the project lives, and they are the only two files that import React directly.

The test file sits next to the resolver it is testing, and depends only on the resolver and the surface and spec types, not on anything React related.

The two public image files referenced by the sample ad, along with the small icon and favicon assets used by the app itself, sit in the public folder and are served as static files.