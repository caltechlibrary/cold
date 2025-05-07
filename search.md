
# COLD UI Project

<link href="./pagefind/pagefind-ui.css" rel="stylesheet">
<script src="./pagefind/pagefind-ui.js" type="text/javascript"></script>
<div id="search"></div>
<script>
    console.log(`DEBUG windows.location -> ${window.location.href}`);
    const u = URL.parse(window.location.href);
    console.log(`DEBUG u.pathname -> ${u.pathname}`);
    const basePath = u.pathname.replace(/search\.html$/g, '');
    console.log(`DEBUG basePath -> ${basePath}`);
    
    window.addEventListener('DOMContentLoaded', (event) => {
        new PagefindUI({ 
            element: "#search",
            baseUrl: basePath
        });
    });
</script>



