import { escapeHtml } from "./escapeHtml";

export function displayGrantedAccess(accessGrant: any, fileContent: string) {
    return `<h2>Access Grant</h2>
<pre><code>${JSON.stringify(accessGrant, undefined, "  ")}</code></pre>
<h2>Resource content</h2>
<pre><code>${escapeHtml(fileContent)}</code></pre>`
}
