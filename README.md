# Adaptive Layout Engine

This is a layout engine for advertisements. You describe an ad once, as a plain list of content pieces, and then hand that same description over to whatever screen it needs to appear on.

The engine works out how each piece should be sized and placed depending on the screen it lands on. Nobody has to sit down and design a separate layout for every screen type by hand.

The short version of the idea is this. You do not draw a mobile ad and a broadcast ad and a kiosk ad separately. You describe what the ad contains once. You describe what each screen can offer once. The engine figures out the rest on its own.

---

## What is actually inside an ad

An ad here is made up of a small number of pieces.

In the sample ad shipped with this project, that means a headline, a product name, a product image, a call to action button, a logo, and a price.

Each piece carries a few things about itself.

What kind of thing it is, meaning whether it is text, an image, or a button.

What role it plays in the ad, meaning whether it is the main headline, the hero image, the action, the branding, or a secondary detail.

How important it is, on a simple scale from one to three. One means it should basically never be dropped. Three means it is allowed to shrink or vanish first if the screen genuinely runs out of room.

And of course its actual content, whatever text or image path it is meant to carry.

That description lives in its own file, and it has no idea what screen it will eventually be shown on. It is not aware mobile phones or broadcast banners even exist.

It also gets checked the moment the app starts up. If someone typed a role that does not exist, or left a button with no text, or paired a hero role with something that is not actually an image, the app refuses to run and prints a clear error instead of quietly rendering something broken.

---

## What a screen looks like to the engine

A screen, referred to here as a surface, is described by its width and height, along with a handful of real constraints that actually matter for that kind of screen.

A phone screen cares about safe margins near its edges, and about making sure a button is large enough for a thumb to reliably tap.

A broadcast lower third, the kind of banner that runs across the bottom of a TV screen, is viewed from much farther away, so its text needs to be noticeably larger to stay readable.

A kiosk is touch only. There is no mouse to fall back on, so every interactive piece needs a comfortably large tap area.

Six such surfaces are defined in this project right now. A mobile portrait phone. A mobile landscape phone. A broadcast lower third. A square retail kiosk. One small surface added specifically to show how badly things get squeezed when there truly is not enough room. And one more small custom surface used for extra testing.

None of these six are known to the engine in any special way. They are just data sitting in a file. The engine itself has no idea any of them exist by name, and would treat a seventh surface it has never seen exactly the same way.

---

## How the pieces fit together

The overall flow is fairly simple, even if the resolver itself does a fair amount of work internally.

You start with the ad description and the surface description.

Those two things get handed to the resolver, which is the actual layout algorithm and the heart of this whole project.

The resolver hands back a resolved layout. That is nothing more than a list of boxes, one per ad piece, plus a flag saying whether that piece should actually be shown at all.

That resolved layout then gets handed to a renderer, which is the part that turns it into real, positioned elements on the page.

The React app sitting on top of all of this is only responsible for the surface picker, the live preview, and the side panels that explain what is happening. It does not do any layout thinking of its own. It just calls the resolver and the renderer and displays whatever comes back.

Each of those responsibilities lives in its own file, which keeps things easy to reason about one piece at a time.

The ad description and its validation live together in one file.

The surface definitions live in another file entirely on their own.

The resolver, meaning the algorithm itself, lives in its own file and knows nothing about screens by name, colors, fonts, or React. It only ever deals in numbers and rules.

The shape of a resolved layout, meaning the box and visibility information the resolver hands back, has its own small file too, since it is really the agreed contract between the resolver and anything that wants to draw the result.

The actual drawing happens in a separate rendering file, which only knows how to turn a resolved layout into visible elements. It does not know or care how that layout was decided.

And finally, the app file wires the picker, the preview, and the info panels together, without owning any layout logic itself.

---

## Getting it running

Install the dependencies first.

```
npm install
```

Then start the local development server.

```
npm run dev
```

Open whatever local address Vite prints in the terminal once it starts. That is usually something running on port five one seven three.

There are a few other scripts worth knowing about.

A build script type checks the entire project and then produces a production build.

A preview script serves that production build locally, so you can look at exactly what would be shipped.

A lint script runs oxlint over the code to catch obvious issues.

And a test script is wired directly into npm, so running the resolver's own validation suite is as simple as typing npm test. That suite does not depend on any testing framework at all. It is a self contained set of checks that print a pass line for every case, and finish with one line confirming everything passed, so it is easy to tell at a glance whether something has broken.

---

## Trying the demo

Open the app and it starts on the mobile portrait surface, with the sample ad already resolved and sitting on screen.

There is a picker near the top that lets you jump between all six surfaces. Every time a different surface is chosen, the exact same ad description gets fed back into the resolver from scratch. Nothing about any individual surface's layout is written by hand anywhere in this app.

To actually watch the degradation logic do its job, switch over to the constraint test surface, which is the smallest one in the whole set.

At that size, the resolver cannot fit every single piece of the ad at once. It starts dropping the least important pieces one at a time, until whatever remains genuinely fits without overlapping and without spilling past the edge of the screen.

With the ad that ships in this project, the headline, the product name, and the product image all stay visible. The call to action, the logo, and the price end up dropped.

To see the touch target rule doing something real, switch over to the square kiosk surface. It is marked as touch only, and it explicitly asks for a sixty pixel minimum tap target. The call to action button ends up resolved at that size or larger, never smaller.

Worth trying separately, look at a touch only surface that never states its own minimum tap target at all. The engine still falls back to a sensible forty four pixel minimum on its own, rather than shipping a button too small to reliably tap with a finger.

Sitting alongside the preview, there is an info panel. It shows how many pieces of the ad are currently visible out of the total. It shows the raw numbers behind whichever surface is currently selected. And it lists every single piece, marking each one as visible or hidden, along with its resolved size.

Beyond just switching between surfaces, the app also lets you keep more than one ad around at once and switch between them, and lets you edit the text content of any individual piece directly and watch the layout update live as you type.

None of that editing is saved anywhere. Refreshing the page resets everything back to the single sample ad this project ships with. It exists to make it easy to poke at the resolver with different content lengths during a demo, not to act as any kind of real content management system.

---

## How the resolver actually decides where things go

The resolver takes whatever ad pieces remain in play, along with a surface, and runs through a loop.

First it works out the actual usable space on the screen. That is just the surface's width and height, minus whatever safe margin the surface asked for around its edges.

Then it decides on a composition style, based purely on the surface's shape. A tall, narrow surface gets a vertical composition. A wide, short surface gets a horizontal one. Anything closer to square gets a more balanced composition that borrows a bit from both of the others. This decision comes entirely from the aspect ratio of the surface. Nothing in this step ever looks at what the surface is actually called.

With a composition style chosen, every remaining piece is given a preferred size and a minimum size, based on its role and the chosen direction.

The preferred size is what a piece would like to have if space were unlimited.

The minimum size is the smallest that piece is ever allowed to shrink to before it has to be dropped from the layout entirely instead.

If the pieces do not all fit at their preferred sizes, the lower priority ones give up space first. They shrink down toward their own minimums before anything higher priority is touched at all.

Once a candidate layout has actually been built, it gets checked against every hard rule that genuinely matters.

Every piece needs to have actually been placed somewhere.

Nothing is allowed to end up with a zero or negative size.

Everything has to sit fully inside the usable area, with nothing spilling past the edge.

No two visible pieces are allowed to overlap one another.

Any text needs to be tall enough to actually hold its content at the surface's minimum readable size.

Any button needs to be large enough to satisfy the surface's tap target requirement, including that fallback default on touch only surfaces that never stated one directly.

And a call to action button always keeps enough width to hold its own label, no matter what else is happening around it.

If all of that checks out, the resolver returns the boxes for everything currently visible, along with a zero size, hidden entry for anything that was left out along the way.

If it does not check out, the resolver removes exactly one piece. Specifically, the least important piece still remaining. If two pieces are tied on importance, the one that comes later in the original list is the one removed, which keeps the outcome predictable rather than random.

That whole process repeats, over and over, until either something finally works, or there is genuinely nothing left that can be dropped.

If every combination still fails, there is one final fallback. It tries to fit only the single most important piece by itself, alone on the screen. If even that one piece cannot fit, which can genuinely happen if a surface is smaller than what readable text needs at the minimum allowed size, the resolver hides everything rather than let anything render clipped, cut off, or overlapping.

That last case might look harsh in an extreme situation, but it reflects a real, deliberate choice made here. A layout that looks broken is worse than one that simply shows nothing.

This whole approach is best described as a priority ordered pass that shrinks first, and only drops something once shrinking genuinely is not enough. It is not a lookup table keyed on surface names, and there is nowhere in this file that checks what any surface happens to be called.

---

## The touch only rule specifically

Surfaces can be marked as touch only, meaning touch is genuinely the only way anyone will ever interact with them, the way a retail kiosk works.

On a surface like that, there is no mouse to fall back on if a button ends up too small. So the resolver treats the effective minimum tap target as whatever the surface explicitly asks for, or a sensible forty four pixel default if the surface is touch only but never gave a number at all.

That combined rule gets used everywhere a tap target matters. Both while checking whether a candidate layout is even valid, and when handing sizing information along to whatever eventually renders the final result.

---

## Why the typing matters here

The ad description and the surface description are both plain TypeScript interfaces. That gives good protection at the moment the code is written, but interfaces alone do nothing once real data starts arriving from somewhere outside the type checker, whether that is a form, an API call, or a file someone hand edited themselves.

That is why the spec file also carries a runtime check. It walks through every single piece of an ad and confirms it genuinely matches what it claims to be.

It checks that the piece list is not empty.

It checks that every id is filled in and unique across the whole ad.

It checks that the type is one of the three allowed kinds.

It checks that the role is one of the five allowed roles.

It checks that the priority is one, two, or three, and nothing else.

It checks that the content is not blank.

And it checks that certain roles are only allowed to pair with certain types. A hero role, for instance, only makes sense paired with an image. It would not make sense paired with a plain block of text.

That check runs once, right at the moment the sample ad is defined, so nothing further downstream ever has to second guess whether the ad it received is actually valid.

---

## How rendering stays separate from layout

The resolver has no idea what React is, what the DOM is, or what CSS even looks like. Its only job in the world is to produce that flat list of boxes and visibility flags.

The actual drawing happens in a separate rendering file. Its job is to take the original ad description, the resolver's output, and the surface, and turn all three of those into real, positioned elements.

It reads the minimum text size the resolver worked out, and applies that directly as the font size for text pieces.

It reads the minimum tap target the resolver worked out, and applies that as the minimum width and height for buttons.

Anything the resolver marked as not visible simply gets hidden, rather than removed entirely, which keeps the underlying structure predictable no matter what is currently shown.

The stylesheet handles how things actually look inside those resolved boxes. Things like color, font weight, and general polish. It deliberately avoids trying to build a second, competing layout system of its own on top of what the resolver already decided.

Any font size values written directly into the stylesheet are only there as a fallback, for the rare case where the resolver did not supply one of its own. The resolver's own number always wins whenever it is present.

---

## The validation suite

There is a self contained set of checks for the resolver that does not depend on any testing framework at all. It currently covers nineteen separate cases.

Those cases walk through every one of the six demo surfaces individually. Both layout directions, plus the balanced case in between. An empty ad with nothing in it. A single piece ad. A larger ad with many pieces at once. A surface with no safe margin defined at all. Forced shrinking all the way down to minimum size. Priority based dropping when there is truly no room left. A check that nothing ever ends up placed at a negative position. A check that nothing ever spills past the edge of the screen. A check that nothing ever overlaps anything else. The touch only fallback behavior specifically. And one deliberately unfamiliar surface that was never part of the demo set at all, added purely to prove the resolver does not secretly depend on recognizing any of the six named surfaces it ships with.

That last check matters more than it might look like at first glance. It is the clearest proof available that this is a genuinely general algorithm, rather than a set of answers memorized ahead of time for six specific screens.

---

## What this project does not do yet

The resolver reasons about text mostly using estimated heights, based on rough character counting, rather than always truly measuring how a real browser would wrap that exact string. The rendering layer does attempt real, in browser measurement where it reasonably can, and only falls back to the estimate when that is not available. Even so, two headlines of very different lengths can still end up receiving the same resolved box size for a given role and surface in some situations.

The numbers deciding how much space each role prefers, and how far it is allowed to shrink, were tuned by hand against the six demo surfaces, rather than derived from any general formula. They hold up well across the surfaces actually tested here, but they remain hand picked constants rather than anything mathematically principled.

There is exactly one renderer right now, the one responsible for drawing to the page. The resolver was deliberately built so a second renderer, something that draws to a canvas instead for example, could consume the exact same resolved layout without the resolver needing to change at all. That second renderer simply has not been written yet, so that separation is proven in design so far, rather than in a second working example sitting alongside the first.

The forty four pixel fallback used for touch only surfaces that never specify their own tap target is a fixed number inside the resolver, rather than something a project could configure differently.

The multiple ad management and live content editing inside the app is genuinely real and does work as described. But none of it is saved anywhere. It resets the instant the page reloads, and it exists mainly as a fast way to try different content lengths during a demo, rather than as any kind of real authoring tool.

---

## What was actually fixed along the way

A few real problems came up while building this, and they are worth naming honestly rather than pretending the first draft was already clean.

Early on, the minimum text size and minimum tap target numbers were being calculated correctly by the resolver, but were never actually being applied anywhere once rendering happened. That has since been fixed. The renderer now reads both values straight off the resolver's own output and applies them directly.

Rendering and layout decisions were originally tangled together inside the app file itself. That has since been pulled apart cleanly, so the app file no longer contains any layout or drawing logic of its own, and instead simply calls out to the dedicated rendering file when it needs something drawn.

The touch only flag on a surface was defined in the data, but was not actually influencing anything the resolver did with it. It now genuinely affects the minimum tap target the resolver enforces, including that fallback default described earlier.

There was no test specifically proving the touch only fallback behaved correctly, and there was no test proving the resolver could handle a completely unfamiliar surface it had never encountered before. Both of those now exist as part of the validation suite.

The ad description used to rely purely on TypeScript's compile time checking, with nothing at all catching a malformed ad once the program was actually running. It now has the runtime validation described earlier, which catches duplicate ids, invalid types, invalid roles, invalid priorities, empty content, and mismatched role and type combinations before anything downstream ever sees them.

---

## A note on two different paths through the horizontal case

This is worth being upfront about rather than glossing over.

For wide, horizontal surfaces, there are actually two different ways the resolver can lay things out. An older, simpler approach that carves the space into a few named regions, and a newer approach that composes the hero image, the surrounding text, and the actions together more deliberately.

Which one runs is controlled by a flag set directly on the surface itself, inside the surface definitions file, not by checking a surface's name anywhere in the resolver. So it still respects the underlying rule that nothing is special cased by identity.

That said, having two separate horizontal strategies living side by side is not the cleanest possible shape for this code to be in. Folding both of them into one shared approach is the single clearest next improvement this project could use, and it is something worth calling out openly rather than hoping nobody notices.

---

## Tools used while building this

Planning, and an early pass at this documentation, were done with the help of ChatGPT.

That documentation was then checked back against the actual working code, and corrected, with the help of Claude, which was also used to reverify the documentation according to the projecst and for clean up tasks.

---

## Time spent

Roughly forty hours went into this altogether, spread across about three and a half days of actual work.

Something like half a day of that total was spent purely on planning, before any real code was written at all.
