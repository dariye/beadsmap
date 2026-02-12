<script lang="ts">
  interface Props {
    value: number
  }
  let { value }: Props = $props()
  const pct = $derived(Math.round(value * 100))
</script>

<div class="progress-wrap">
  <div class="progress-track">
    <div
      class="progress-fill"
      class:fill-done={pct === 100}
      class:fill-active={pct > 0 && pct < 100}
      class:fill-empty={pct === 0}
      style="width: {pct}%"
    ></div>
  </div>
  <span class="progress-label">{pct}%</span>
</div>

<style>
  .progress-wrap { display: flex; align-items: center; gap: 8px; }
  .progress-track {
    flex: 1;
    height: 5px;
    border-radius: 3px;
    background: var(--color-surface-2);
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 500ms ease;
  }
  .fill-done { background: var(--color-done); }
  .fill-active { background: var(--color-accent); }
  .fill-empty { background: var(--color-border); }
  .progress-label {
    font-size: 11px;
    color: var(--color-text-faint);
    font-variant-numeric: tabular-nums;
    width: 32px;
    text-align: right;
  }
</style>
