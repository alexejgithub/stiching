# Persistence model

Type: grilling
Status: resolved

## Question

Given v1 is client-side only with no backend, how do patterns get saved/loaded — explicit file export/import only, browser storage only, or both?

## Answer

Both: the in-progress pattern auto-saves continuously to browser storage (e.g. IndexedDB) so a refresh or crash doesn't lose work, plus an explicit export/import file for moving a pattern between devices or backing it up. Pure file-only risks accidental data loss; pure browser-storage-only traps a pattern on one device, which contradicts "runs on any device." See [Design persistence layer implementation](../issues/15-persistence-layer.md) for the concrete schema.
