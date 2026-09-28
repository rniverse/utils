/**
 * Load a value once; every `get()` while the load is in flight shares it. A
 * successful load is cached until `reset()`; a failed one is not, so the next
 * `get()` loads again. No caller signal reaches `load` — one caller giving up
 * must not cancel the shared load (wrap your own wait in `timeout` instead).
 */
export function lazy(load) {
    let slot = null;
    return {
        get() {
            if (slot)
                return slot;
            // Start `load` now, synchronously — not a microtask later — so its
            // synchronous prefix runs before `get()` returns. A caller that does
            // `get(); close()` can rely on the load having begun first. A
            // synchronous throw still becomes a rejection.
            let mine;
            try {
                mine = Promise.resolve(load());
            }
            catch (error) {
                mine = Promise.reject(error);
            }
            slot = mine;
            // Clear only our own failed load: after a `reset()` and a newer load,
            // `slot` holds that one, and this stale failure must not touch it.
            mine.catch(() => {
                if (slot === mine)
                    slot = null;
            });
            return mine;
        },
        reset() {
            slot = null;
        },
    };
}
//# sourceMappingURL=lazy.js.map