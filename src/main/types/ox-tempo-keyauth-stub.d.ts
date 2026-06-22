/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// Stub for the ox/tempo/KeyAuthorization module. The upstream `ox` package
// (a sub-dependency of viem) ships an incompatible pair of overloads
// between the "signed" payload type and the "unsigned" payload type, and
// TypeScript can't reconcile the two. The `tempo` chain subpackage is
// not used anywhere in this project, so we redirect the import to this
// empty stub to keep `tsc --noEmit` clean.
declare module 'ox/tempo/KeyAuthorization' {}
