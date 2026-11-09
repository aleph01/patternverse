<script lang="ts">
  import type { ComponentParameter } from './component-catalog';
  let {
    parameters,
    label = 'Component parameters',
  }: { parameters: readonly ComponentParameter[]; label?: string } = $props();
</script>

<table aria-label={label}>
  <thead
    ><tr
      ><th scope="col">Parameter</th><th scope="col">Type</th><th scope="col">Default</th><th
        scope="col">Use & constraints</th
      ></tr
    ></thead
  >
  <tbody>
    {#each parameters as parameter (parameter.name)}
      <tr>
        <th scope="row"
          ><code>{parameter.name}</code><span
            class="requirement"
            class:required={parameter.requirement === 'Required'}>{parameter.requirement}</span
          ></th
        >
        <td
          ><span class="mobile-label" aria-hidden="true">Type</span><code>{parameter.type}</code
          ></td
        >
        <td><span class="mobile-label" aria-hidden="true">Default</span>{parameter.defaultValue}</td
        >
        <td class="description">{parameter.description}</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 13px;
    line-height: 1.65;
    text-align: left;
  }
  thead th {
    padding: 10px 12px;
    color: var(--muted, #62655f);
    font-size: 11px;
    font-weight: 600;
    border-bottom: 1px solid #cdd5c9;
  }
  thead th:first-child {
    width: 22%;
  }
  thead th:nth-child(2) {
    width: 19%;
  }
  thead th:nth-child(3) {
    width: 17%;
  }
  tbody th,
  td {
    padding: 16px 12px;
    border-bottom: 1px solid #e5e8df;
    vertical-align: top;
    overflow-wrap: anywhere;
  }
  tbody th {
    font-weight: 500;
  }
  code {
    font:
      0.9em/1.65 ui-monospace,
      SFMono-Regular,
      Consolas,
      monospace;
  }
  tbody th code {
    font-weight: 650;
  }
  .requirement {
    display: block;
    margin-top: 5px;
    color: var(--muted, #62655f);
    font-size: 11px;
    font-weight: 400;
  }
  .requirement.required {
    color: var(--green-dark, #007a4d);
  }
  .mobile-label {
    display: none;
  }
  @media (max-width: 740px) {
    table,
    tbody {
      display: block;
    }
    thead {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
    tr {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      padding: 16px 0;
      border-bottom: 1px solid #dfe4d9;
    }
    tbody th,
    td {
      display: block;
      border: 0;
      padding: 4px 0;
    }
    tbody th {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
    }
    .requirement {
      margin: 0;
      flex-shrink: 0;
    }
    .mobile-label {
      display: inline-block;
      min-width: 64px;
      color: var(--muted, #62655f);
      font-size: 11px;
    }
    .description {
      padding-top: 8px;
    }
  }
</style>
