<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    variant?: 'default' | 'done' | 'progress' | 'blocked' | 'open' | 'outline'
    children: Snippet
  }
  let { variant = 'default', children }: Props = $props()
</script>

<span
  class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
  class:badge-default={variant === 'default'}
  class:badge-done={variant === 'done'}
  class:badge-progress={variant === 'progress'}
  class:badge-blocked={variant === 'blocked'}
  class:badge-open={variant === 'open'}
  class:badge-outline={variant === 'outline'}
>
  {@render children()}
</span>

<style>
  .badge-default { background: var(--color-surface-2); color: var(--color-text); }
  .badge-done { background: color-mix(in srgb, var(--color-done) 18%, transparent); color: var(--color-done); }
  .badge-progress { background: color-mix(in srgb, var(--color-accent) 18%, transparent); color: var(--color-accent); }
  .badge-blocked { background: color-mix(in srgb, var(--color-blocked) 18%, transparent); color: var(--color-blocked); }
  .badge-open { background: var(--color-surface-2); color: var(--color-text-muted); }
  .badge-outline { border: 1px solid var(--color-border); color: var(--color-text-muted); }
</style>
