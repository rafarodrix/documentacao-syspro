---
version: alpha
name: DOSC Syspro Portal
description: >
  Agent-readable summary of the current portal visual system. This file is a
  documentation artifact and should stay aligned with packages/ui/src/tokens.css.
colors:
  background: "#FFFFFF"
  foreground: "#171717"
  primary: "#262626"
  primary-foreground: "#FAFAFA"
  secondary: "#F5F5F5"
  secondary-foreground: "#262626"
  muted: "#F5F5F5"
  muted-foreground: "#737373"
  accent: "#F5F5F5"
  accent-foreground: "#262626"
  destructive: "#D84A4A"
  border: "#E5E5E5"
  ring: "#A3A3A3"
typography:
  display-1:
    fontFamily: Inter
    fontSize: 4.5rem
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  h1:
    fontFamily: Inter
    fontSize: 3rem
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 2.25rem
    fontWeight: 700
    lineHeight: 1.2
  h3:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.55
  caption:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: 0.375rem
  md: 0.5rem
  lg: 0.625rem
  xl: 0.875rem
  pill: 9999px
spacing:
  1: 0.25rem
  2: 0.5rem
  3: 0.75rem
  4: 1rem
  6: 1.5rem
  8: 2rem
  12: 3rem
  16: 4rem
components:
  app-shell:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
  primary-button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    borderRadius: "{rounded.md}"
  secondary-button:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    borderRadius: "{rounded.md}"
  card:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    borderColor: "{colors.border}"
    borderRadius: "{rounded.xl}"
  docs-sidebar:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    borderColor: "{colors.border}"
    borderRadius: "{rounded.xl}"
---

## Overview

The portal uses an intentionally restrained interface built on neutral contrast,
high readability, and low brand saturation. The product should feel operational,
stable, and dense enough for daily work without looking bureaucratic.

## Colors

The main palette is achromatic. Primary actions use near-black on light surfaces,
with light neutrals handling panels, separators, and secondary actions.

Accent colors exist in the codebase, but they are restricted to charts, status
markers, icon tiles, and other local emphasis surfaces. They are not the main
brand expression and should not drive large interactive regions.

## Typography

Inter is the default typeface across the portal. Headings are bold and compact,
while body copy prioritizes stable rhythm and readability.

Avoid introducing alternate display fonts unless the design system itself is
being revised.

## Shape and spacing

Corners are soft but not playful. Standard controls sit around the medium radius
scale, while larger documentation and shell surfaces may use larger radii.

Spacing should stay on the existing scale and avoid one-off values.

## Components

Cards, shells, and documentation surfaces should look layered through contrast,
blur, and shadows rather than through strong hue. Primary buttons should remain
high contrast and unambiguous.

## Usage guidance

Use this file to brief coding agents before they generate new pages, sections,
or component variants. If a visual choice conflicts with `packages/ui/src/tokens.css`,
the CSS tokens win and this file must be updated to match.

