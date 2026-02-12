<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    text: string
    children: Snippet
  }
  let { text, children }: Props = $props()
  let show = $state(false)
  let x = $state(0)
  let y = $state(0)

  function onmouse(e: MouseEvent) {
    x = e.clientX
    y = e.clientY
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<span
  class="contents"
  onmouseenter={() => (show = true)}
  onmouseleave={() => (show = false)}
  onmousemove={onmouse}
>
  {@render children()}
</span>

{#if show}
  <div class="tt" style="left: {x + 12}px; top: {y - 8}px">
    {text}
  </div>
{/if}

<style>
  .tt {
    position: fixed;
    z-index: 50;
    padding: 5px 10px;
    font-size: 12px;
    color: var(--color-text);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    box-shadow: 0 4px 12px var(--color-shadow);
    pointer-events: none;
  }
</style>
