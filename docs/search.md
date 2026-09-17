# Search

<link href="./pagefind/pagefind-ui.css" rel="stylesheet">
<script src="./pagefind/pagefind-ui.js" type="text/javascript"></script>
<div id="search"></div>
<script>
// The shared theme's nav links here whenever the site is built with search
// enabled, but the build does not generate this page -- each project supplies
// it. The pagefind/ directory is produced by the index-site action, so these
// two assets do not exist until after the site is indexed.
const basePath = URL.parse(window.location.href).pathname
    .replace(/search\.html$/, '');

function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

const searchQuery = getQueryParam('q');

window.addEventListener('DOMContentLoaded', () => {
    const searchUI = new PagefindUI({
        element: "#search",
        baseUrl: basePath
    });
    if (searchQuery) {
        searchUI.triggerSearch(searchQuery);
    }
});
</script>
