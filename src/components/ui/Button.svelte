<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    variant?: 'default' | 'ghost' | 'outline' | 'primary'
    size?: 'sm' | 'md'
    onclick?: () => void
    disabled?: boolean
    children: Snippet
  }

  let { variant = 'default', size = 'md', onclick, disabled = false, children }: Props = $props()
</script>

<button
  class="btn"
  class:btn-default={variant === 'default'}
  class:btn-ghost={variant === 'ghost'}
  class:btn-outline={variant === 'outline'}
  class:btn-primary={variant === 'primary'}
  class:btn-sm={size === 'sm'}
  class:btn-md={size === 'md'}
  {onclick}
  {disabled}
>
  {@render children()}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    font-weight: 500;
    transition: color 120ms ease, background 120ms ease, border-color 120ms ease, opacity 120ms ease;
    cursor: pointer;
    border: none;
    font-family: inherit;
    letter-spacing: -0.006em;
  }
  .btn:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 1px;
  }
  .btn-sm { height: 26px; padding: 0 8px; font-size: 12px; }
  .btn-md { height: 32px; padding: 0 12px; font-size: 13px; }
  .btn-default {
    background: var(--color-text);
    color: var(--color-bg);
  }
  .btn-default:hover { opacity: 0.85; }
  .btn-ghost {
    background: transparent;
    color: var(--color-text-faint);
  }
  .btn-ghost:hover {
    background: color-mix(in srgb, var(--color-surface) 70%, transparent);
    color: var(--color-text);
  }
  .btn-outline {
    background: transparent;
    border: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
    color: var(--color-text-muted);
  }
  .btn-outline:hover {
    background: var(--color-surface);
    color: var(--color-text);
    border-color: var(--color-border);
  }
  .btn-primary {
    background: var(--color-accent);
    color: var(--color-bar-text);
  }
  .btn-primary:hover { opacity: 0.88; }
  .btn:disabled { opacity: 0.35; cursor: default; pointer-events: none; }
</style>
