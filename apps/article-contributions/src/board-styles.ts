export const boardStyles = `
body{--pv-paper:light-dark(#fafaf8,#1b1b19);--pv-card:light-dark(#ffffff,#222220);--pv-ink:light-dark(#252522,#ededE7);--pv-muted:light-dark(#72726b,#b0b0a5);--pv-line:light-dark(#deded8,#41413b);--pv-soft:light-dark(#f1f1ed,#2d2d29);--pv-yellow:light-dark(#fff0a6,#665618);--pv-mark-ink:light-dark(#252522,#fff4bf);--pv-warm:light-dark(#faf5df,#363222);color:var(--pv-ink);background:var(--pv-paper);font:400 13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100dvh;border:1px solid var(--pv-line);overflow-wrap:anywhere;--pv-row-pad:17px;--pv-reading:16px;display:flex;flex-direction:column}
body *{box-sizing:border-box}
body h1,body h2,body h3,body p{margin:0}
body button,body input,body select,body textarea{font:inherit;color:inherit}
body button{cursor:var(--cursor-interaction,pointer)}
body button:disabled{opacity:.45;cursor:default}
body strong{font-weight:500}
.pv-detail>.pv-labels{display:none}
body svg{width:16px;height:16px;flex-shrink:0;stroke-width:1.5}
.pv-chrome{padding:14px 26px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--pv-line);padding-right:110px}
.pv-wordmark{letter-spacing:-.5px;font-size:17px}
.pv-slash{color:var(--pv-muted)}
.pv-preview{margin-left:auto;color:var(--pv-muted);font-size:11px;display:flex;align-items:center;gap:6px}
.pv-preview svg{width:13px;height:13px}
.pv-page-head{padding:22px 26px 18px;display:flex;align-items:end;justify-content:space-between;gap:18px}
.pv-page-head h1{font:400 32px/1.15 Georgia,serif;letter-spacing:-.8px}
.pv-page-head p{margin-top:7px;color:var(--pv-muted)}
.pv-owner{font-size:11px;color:var(--pv-muted);display:flex;gap:6px;align-items:center;white-space:nowrap}
.pv-filters{padding:0 26px 15px;display:flex;gap:9px;align-items:center;flex-wrap:wrap}
.pv-search{display:flex;align-items:center;gap:9px;border:1px solid var(--pv-line);background:var(--pv-card);border-radius:5px;padding:9px 11px;flex:1;min-width:220px}
.pv-search svg{color:var(--pv-muted)}
.pv-search input{width:100%;background:transparent;border:0;outline-offset:5px;min-width:0}
.pv-select{background:var(--pv-card);border:1px solid var(--pv-line);border-radius:5px;padding:9px 25px 9px 10px;max-width:100%}
.pv-status-tabs{padding:0 26px;display:flex;gap:25px;border-bottom:1px solid var(--pv-line);flex-wrap:wrap}
.pv-status-tabs a{border:0;border-bottom:2px solid transparent;margin-bottom:-1px;padding:0 0 13px;background:transparent;color:var(--pv-muted);display:flex;gap:7px;align-items:center;white-space:nowrap}
.pv-status-tabs a[aria-current=true]{color:var(--pv-ink);border-bottom-color:var(--pv-ink)}
.pv-count{font-size:11px;background:var(--pv-soft);border-radius:4px;min-width:19px;padding:1px 5px;text-align:center;font-variant-numeric:tabular-nums}
.pv-workspace{display:grid;flex:1;grid-template-columns:minmax(225px,29%) minmax(0,1fr)}
.pv-queue{padding:17px 0;border-right:1px solid var(--pv-line);background:var(--pv-paper)}
.pv-queue-heading{display:flex;justify-content:space-between;color:var(--pv-muted);font-size:11px;padding:0 19px 12px}
.pv-submission{display:block;width:100%;text-align:left;border:0;border-left:3px solid transparent;border-bottom:1px solid var(--pv-line);padding:var(--pv-row-pad) 17px;background:transparent}
.pv-submission:hover{background:var(--pv-soft)}
.pv-submission[aria-current=true]{border-left-color:var(--pv-ink);background:var(--pv-card)}
.pv-submission h3{font:400 18px/1.3 Georgia,serif;letter-spacing:-.2px;margin:8px 0 10px}
.pv-row-top,.pv-row-bottom{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;color:var(--pv-muted)}
.pv-row-bottom{margin-top:9px}
.pv-quiet{color:var(--pv-muted)}
.pv-labels{display:flex;gap:5px;flex-wrap:wrap;margin-top:10px}
.pv-label{font-size:11px;border:1px solid var(--pv-line);padding:1px 6px;border-radius:4px;color:var(--pv-muted)}
.pv-new-dot{width:6px;height:6px;border-radius:50%;background:var(--pv-yellow);box-shadow:0 0 0 1px var(--pv-line);display:inline-block;margin-right:5px}
.pv-detail{min-width:0;background:var(--pv-card);padding:24px 27px 28px}
.pv-detail-top{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}
.pv-eyebrow{text-transform:uppercase;letter-spacing:1.3px;font-size:10px;color:var(--pv-muted)}
.pv-status{border:1px solid var(--pv-line);border-radius:20px;font-size:11px;padding:3px 9px;display:inline-flex;gap:5px;align-items:center;white-space:nowrap}
.pv-status svg{width:12px;height:12px}
.pv-pager{display:flex;gap:4px;align-items:center}
.pv-pager>span{font-size:11px;color:var(--pv-muted);margin-right:7px}
.pv-icon-button{border:1px solid var(--pv-line);border-radius:4px;background:var(--pv-card);padding:5px;display:inline-grid;place-items:center;width:29px;height:29px}
.pv-detail h2{font:400 27px/1.2 Georgia,serif;letter-spacing:-.6px;max-width:650px}
.pv-byline{margin-top:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.pv-avatar{background:var(--pv-soft);border-radius:50%;display:inline-grid;place-items:center;width:29px;height:29px;font-size:10px;letter-spacing:.3px;flex-shrink:0}
.pv-meta{font-size:11px;color:var(--pv-muted)}
.pv-byline p{font-size:12px}
.pv-contributor-note{color:var(--pv-muted);margin-top:12px!important;font-size:12px;max-width:65ch}
.pv-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:17px 0}
.pv-button{border:1px solid var(--pv-line);background:var(--pv-card);border-radius:5px;padding:8px 11px;display:inline-flex;gap:7px;align-items:center;justify-content:center;white-space:nowrap;font-size:12px}
.pv-button.primary{background:var(--pv-ink);color:var(--pv-card);border-color:var(--pv-ink)}
.pv-button.quiet{border-color:transparent;background:transparent;color:var(--pv-muted);padding-left:5px;padding-right:5px}
.pv-button:hover,.pv-icon-button:hover{box-shadow:inset 0 0 0 1px var(--pv-line)}
.pv-approval-note{display:flex;gap:6px;align-items:center;color:var(--pv-muted);font-size:11px;margin-bottom:16px!important}
.pv-approval-note svg{width:13px;height:13px}
.pv-content-tabs{display:flex;gap:22px;border-bottom:1px solid var(--pv-line);margin-bottom:16px;flex-wrap:wrap}
.pv-content-tabs a{display:flex;align-items:center;gap:6px;border:0;border-bottom:2px solid transparent;background:transparent;padding:0 0 10px;color:var(--pv-muted);margin-bottom:-1px;font-size:12px}
.pv-content-tabs a[aria-current=true]{border-bottom-color:var(--pv-ink);color:var(--pv-ink)}
.pv-edit{border:1px solid var(--pv-line);border-radius:6px;margin-bottom:13px;overflow:hidden}
.pv-edit-head{padding:11px 14px;border-bottom:1px solid var(--pv-line);display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:11px}
.pv-edit-head span{color:var(--pv-muted)}
.pv-reading{font:400 var(--pv-reading)/1.7 Georgia,serif;padding:17px 17px 20px}
.pv-reading ins{background:var(--pv-yellow);color:var(--pv-mark-ink);text-decoration:none;padding:1px 1px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.pv-reading del{color:var(--pv-ink);text-decoration:line-through;text-decoration-thickness:1px}
.pv-reading p+p{margin-top:16px}
.pv-context-copy{color:var(--pv-muted)}
.pv-legend{display:flex;gap:15px;align-items:center;font-size:11px;color:var(--pv-muted);margin:0 0 11px}
.pv-legend mark{background:var(--pv-yellow);color:var(--pv-mark-ink);padding:0 4px}
.pv-section-label{font-size:11px;letter-spacing:.2px;color:var(--pv-muted);margin:17px 0 8px}
.pv-comment{border:1px solid var(--pv-line);border-radius:6px;padding:14px 15px;margin-bottom:13px}
.pv-comment-head{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--pv-muted);margin-bottom:11px}
.pv-comment-number{width:21px;height:21px;display:inline-grid;place-items:center;border-radius:50%;background:var(--pv-ink);color:var(--pv-card)}
.pv-quotes{display:grid;gap:9px;margin-bottom:13px}
.pv-quote{border-left:2px solid var(--pv-line);padding:1px 0 1px 11px}
.pv-quote small{font-size:10px;color:var(--pv-muted);display:block;margin-bottom:3px}
.pv-quote p{font:400 15px/1.5 Georgia,serif}
.pv-comment-body{font-size:13px;line-height:1.65}
.pv-comment details{font-size:11px;color:var(--pv-muted);margin-top:12px}
.pv-comment details p{margin-top:8px;font:400 14px/1.6 Georgia,serif}
.pv-organize{border-top:1px solid var(--pv-line);padding-top:15px;margin-top:21px}
.pv-organize summary{font-size:12px;cursor:var(--cursor-interaction,pointer)}
.pv-note-fields{display:grid;gap:12px;margin-top:15px}
.pv-note-fields label{font-size:11px;color:var(--pv-muted);display:grid;gap:6px}
.pv-note-fields textarea,.pv-note-fields input{width:100%;background:var(--pv-paper);border:1px solid var(--pv-line);border-radius:5px;padding:9px 10px;color:var(--pv-ink);font-size:13px;resize:vertical}
.pv-note-fields .pv-checkboxes{display:flex;gap:12px;flex-wrap:wrap}
.pv-checkboxes label{display:flex;align-items:center;gap:5px;color:var(--pv-ink)}
.pv-checkboxes input{width:auto}
.pv-notice{padding:10px 26px;background:var(--pv-soft);display:flex;gap:12px;align-items:center;justify-content:space-between;border-bottom:1px solid var(--pv-line);font-size:12px}
.pv-notice>span{display:flex;gap:8px;align-items:center}
.pv-reject{background:var(--pv-paper);border:1px solid var(--pv-line);border-radius:6px;padding:14px;margin:0 0 20px}
.pv-reject .pv-actions{margin-bottom:0}
.pv-reject textarea{width:100%;background:var(--pv-card);border:1px solid var(--pv-line);border-radius:4px;padding:9px;margin-top:8px;resize:vertical;font-size:13px}
.pv-timeline{list-style:none;padding:0;margin:0}
.pv-timeline li{border-left:1px solid var(--pv-line);padding:0 0 22px 16px;margin-left:5px}
.pv-timeline p{margin-top:5px;color:var(--pv-muted);font-size:12px}
.pv-article-excerpt{border-top:1px solid var(--pv-line);margin-top:10px}
.pv-empty{padding:35px 19px;color:var(--pv-muted);text-align:center}
.pv-table-wrap{padding:0 26px 23px;overflow-x:auto;background:var(--pv-paper)}
.pv-table{width:100%;border-collapse:collapse;text-align:left;font-size:12px}
.pv-table th{font-weight:400;font-size:11px;color:var(--pv-muted);padding:14px 10px;border-bottom:1px solid var(--pv-line)}
.pv-table td{padding:var(--pv-row-pad) 10px;border-bottom:1px solid var(--pv-line);vertical-align:top}
.pv-table tr.pv-selected{background:var(--pv-card)}
.pv-table td:first-child{width:42%}
.pv-table button{font:400 17px/1.3 Georgia,serif;border:0;padding:0;text-align:left;background:transparent;color:var(--pv-ink)}
.pv-table .pv-table-count{margin-top:5px;font-size:11px;color:var(--pv-muted)}
[data-layout=table] .pv-detail{border-top:1px solid var(--pv-line);padding:25px max(26px,7%)}
.pv-organization-label{margin-top:10px;color:var(--pv-muted);font-size:11px}
.pv-footer{margin-top:auto;border-top:1px solid var(--pv-line);padding:12px 26px;display:flex;justify-content:space-between;color:var(--pv-muted);font-size:10px;gap:10px}
@media(max-width:760px){.pv-workspace{grid-template-columns:220px minmax(0,1fr)}.pv-detail{padding:20px 19px}.pv-detail h2{font-size:24px}.pv-chrome{padding-left:20px}.pv-page-head,.pv-filters{padding-left:20px;padding-right:20px}.pv-status-tabs{padding-left:20px;padding-right:20px;gap:19px}.pv-preview{display:none}.pv-actions{gap:7px}}
@media(max-width:600px){body{min-height:100dvh}.pv-workspace{display:block}.pv-queue{border-right:0;border-bottom:1px solid var(--pv-line)}.pv-submission{padding:12px 18px}.pv-submission h3{font-size:17px;margin:5px 0}.pv-queue-heading{padding-bottom:9px}.pv-row-bottom{margin-top:5px}.pv-submission .pv-labels{display:none}.pv-detail{padding:22px 18px}.pv-detail h2{font-size:26px}.pv-owner{display:none}.pv-page-head h1{font-size:30px}.pv-filters{gap:8px}.pv-search{min-width:100%;flex-basis:100%}.pv-filters select{flex:1;min-width:0}.pv-status-tabs{gap:14px}.pv-status-tabs a{font-size:12px}.pv-page-head{padding-top:22px}.pv-table-wrap{padding-left:12px;padding-right:12px}.pv-table{min-width:525px}.pv-content-tabs{gap:17px}.pv-content-tabs a{font-size:11px}.pv-footer{padding-left:18px;padding-right:18px}.pv-notice{padding:10px 18px}}
@media(pointer:coarse){body button,body summary{min-height:40px}body input:not([type=checkbox]),body select,body textarea{font-size:16px}}
.pv-scopes{flex-basis:100%;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.4fr) minmax(0,.7fr);gap:9px;margin-top:2px}
.pv-scopes>label{display:grid;gap:5px;min-width:0}
.pv-scopes>label>span{font-size:11px;color:var(--pv-muted)}
.pv-scopes .pv-select{width:100%;min-width:0}
.pv-taxonomy{margin-top:9px!important;font-size:11px;color:var(--pv-muted)}
@media(max-width:600px){.pv-scopes{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.pv-scopes>label:nth-child(2){grid-column:1 / -1;grid-row:2}.pv-sort{max-width:160px;margin-left:auto}}

.pv-quote blockquote{margin:4px 0 0;font:400 15px/1.6 Georgia,serif;white-space:pre-wrap}.pv-reading,.pv-comment-body,.pv-timeline p{white-space:pre-wrap}
.pv-status-tabs{row-gap:0}
.pv-reading del{margin-inline-end:.15em}
#review{scroll-margin-top:18px}
html{color-scheme:light dark}body{margin:0}a{color:inherit}a.pv-button,a.pv-icon-button,a.pv-submission,.pv-status-tabs a,.pv-content-tabs a{text-decoration:none}.pv-chrome>a{text-decoration:none}.pv-chrome>a:last-child{margin-left:auto;font-size:12px;color:var(--pv-muted)}main{min-width:0}.pv-submission{color:inherit}.pv-actions form{display:inline-flex}.pv-button{cursor:pointer}.pv-workspace>.pv-queue{min-width:0}.pv-queue-inner{position:sticky;top:12px;max-height:calc(100dvh - 24px);overflow-y:auto}.pv-tabs{list-style:none}.pv-detail-top .pv-eyebrow{margin-right:auto}.pv-error{padding:40px;max-width:760px}.pv-error h1{font:400 30px/1.2 Georgia,serif;margin-bottom:18px}.pv-error p{margin:16px 0}.pv-error textarea{display:block;width:100%;min-height:140px}.pv-field{display:grid;gap:6px;font-size:12px;color:var(--pv-muted)}.pv-field input,.pv-field textarea,.pv-field select{background:var(--pv-paper);border:1px solid var(--pv-line);padding:10px;border-radius:5px;color:var(--pv-ink);width:100%}.pv-review-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px}.pv-pagination{display:flex;justify-content:space-between;padding:16px 19px;gap:12px;font-size:12px}.pv-pagination a{text-decoration:none}.pv-detail-links{display:flex;gap:16px;margin-top:19px;color:var(--pv-muted);font-size:11px}.pv-detail-links a{text-underline-offset:3px}.pv-warning{background:var(--pv-warm);padding:12px 14px;margin:15px 0;font-size:12px}.pv-tab-content[hidden]{display:none}.pv-reject{padding:0;border:0;background:transparent;margin:0}.pv-reject>summary{list-style:none}.pv-reject>summary::-webkit-details-marker{display:none}.pv-reject[open]{flex-basis:100%;padding:14px;background:var(--pv-paper);border:1px solid var(--pv-line)}.pv-reject form{display:grid;width:100%;gap:10px;margin-top:12px}.pv-reject textarea{min-height:85px}.pv-reject .pv-actions{margin:0}.pv-organize{scroll-margin-top:20px}.pv-organize form{display:grid;gap:14px;margin-top:16px}.pv-reading a{color:inherit;text-underline-offset:3px}.pv-link-changes{font-size:12px;margin:0;padding:0 17px 15px 32px;overflow-wrap:anywhere}.pv-quote mark{background:var(--pv-yellow);color:var(--pv-mark-ink)}.pv-context-item{margin:18px 0;border-bottom:1px solid var(--pv-line);padding-bottom:18px}.pv-context-item .pv-reading{padding-left:0;padding-right:0}.pv-context-item mark{background:var(--pv-yellow);color:var(--pv-mark-ink)}.pv-timeline strong{font-weight:500}.pv-scopes>label{font-size:11px;color:var(--pv-muted)}.pv-notice form{margin:0}.pv-icon-button{color:inherit}.pv-icon-button[aria-disabled=true]{opacity:.35;pointer-events:none}.pv-icon-button svg{width:15px;height:15px}.pv-count{font-variant-numeric:tabular-nums}.pv-search button{border:0;background:transparent;color:var(--pv-muted);padding:0;display:grid;place-items:center}.pv-footer a{text-decoration:none}.pv-empty .pv-button{margin-top:13px}
@media(max-width:600px){.pv-queue-inner{position:static;max-height:none;overflow:visible}.pv-review-fields{grid-template-columns:1fr}.pv-chrome{padding-right:20px;flex-wrap:wrap}.pv-chrome>a:last-child{font-size:11px}.pv-filters .pv-sort{max-width:none;margin-left:0}.pv-actions{align-items:flex-start}.pv-reject{display:block}.pv-reject[open]{width:100%}.pv-queue{padding-bottom:0}}
`;
