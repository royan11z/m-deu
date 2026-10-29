<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Text data lives in localStorage via src/lib/store.ts (single store, useSyncExternalStore); images live as Blobs in IndexedDB via src/lib/images.ts, referenced by id — keeps localStorage small.
- Export/import bundles text + base64 images into one JSON file (src/lib/store.ts) so new collections must be added there too.
